import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { NodejsFunction, LogLevel } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class HalappListingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // *************
    // Create Queue
    // *************
    const inventoriesUpdateQueue = this.createInventoriesUpdateQueue();
    const pricesUpdateQueue = this.createPricesUpdateQueue();
    // **************
    // Create Bucket
    // **************
    const inventoryBucket = this.createInventoryBucket();
    inventoryBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(inventoriesUpdateQueue)
    );
    const pricebucket = this.createPriceBucket();
    pricebucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(pricesUpdateQueue),
      {
        prefix: "istanbul/produce/input/",
      }
    );
    // **************
    // Create Group
    // **************
    this.createHalPriceGroup(pricebucket);
    // *****************
    // Create DynamoDB
    // ******************
    const inventoryTable = this.createInventoryTable();
    const priceTable = this.createPriceTable();
    // ********************
    // Create API Gateway
    // ********************
    const listingApi = this.createListingApiGateway();
    const listingApiValidator = listingApi.addRequestValidator(
      "HalAppListingApiValidator",
      {
        requestValidatorName: "HalAppListingApiValidator",
        validateRequestParameters: true,
      }
    );
    // ***************************
    // Create Lambda Handler
    // ***************************
    //
    // ****Create SQS Handler Lambda****
    //
    const inventoriesUpdateHandler = new NodejsFunction(
      this,
      "SqsHalInventoriesUpdateHandler",
      {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(1),
        functionName: "SqsHalInventoriesUpdateHandler",
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          `/../src/hal-inventories-update-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
      }
    );
    inventoriesUpdateHandler.addEventSource(
      new SqsEventSource(inventoriesUpdateQueue, {
        batchSize: 1,
      })
    );
    inventoryTable.grantReadWriteData(inventoriesUpdateHandler);
    inventoryBucket.grantReadWrite(inventoriesUpdateHandler);

    const pricesUpdateHandler = new NodejsFunction(
      this,
      "SqsHalPricesUpdateHandler",
      {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(1),
        functionName: "SqsHalPricesUpdateHandler",
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          `/../src/hal-prices-update-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
      }
    );
    pricesUpdateHandler.addEventSource(
      new SqsEventSource(pricesUpdateQueue, {
        batchSize: 1,
      })
    );
    priceTable.grantWriteData(pricesUpdateHandler);
    pricebucket.grantReadWrite(pricesUpdateHandler);

    //
    // ****PRODUCTS API Handler****
    //
    const productsResource = listingApi.root.addResource("products");
    const productResource = productsResource.addResource("{productId}");
    const productPricesResource = productResource.addResource("prices");
    const getProductPricesHandler = new NodejsFunction(
      this,
      "ListingGetProductPricesHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_16_X,
        functionName: "ListingGetProductPricesHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(15),
        entry: path.join(
          __dirname,
          `/../src/listing-get-product-prices-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
      }
    );
    productPricesResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductPricesHandler, {
        proxy: true,
      }),
      {
        requestParameters: {
          "method.request.querystring.duration": true,
          "method.request.querystring.location": true,
          "method.request.querystring.type": true,
          "method.request.querystring.from_date": false,
        },
        requestValidator: listingApiValidator,
      }
    );
    priceTable.grantReadData(getProductPricesHandler);
    //
    // ****INVENTORY API Handler****
    //
    const inventoriesResource = listingApi.root.addResource("inventories");
    const getInventoriesHandler = new NodejsFunction(
      this,
      "ListingGetInventoriesHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_16_X,
        functionName: "ListingGetInventoriesHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(15),
        entry: path.join(
          __dirname,
          `/../src/listing-get-inventories-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
      }
    );
    inventoriesResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getInventoriesHandler, {
        proxy: true,
      })
    );
    inventoryTable.grantReadData(getInventoriesHandler);

    //
    // PRICES API Handler
    //
    const pricesResource = listingApi.root.addResource("prices");
    const getPricesHandler = new NodejsFunction(
      this,
      "ListingGetPricesHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_16_X,
        functionName: "ListingGetPricesHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(15),
        entry: path.join(
          __dirname,
          `/../src/listing-get-prices-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
      }
    );
    pricesResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getPricesHandler, { proxy: true }),
      {
        requestParameters: {
          "method.request.querystring.location": true,
          "method.request.querystring.type": true,
          "method.request.querystring.from_date": false,
          "method.request.querystring.to_date": false,
        },
        requestValidator: listingApiValidator,
      }
    );
    priceTable.grantReadData(getPricesHandler);
    // ********************
    // Create EventBridge
    // ********************
  }
  createInventoriesUpdateQueue(): cdk.aws_sqs.Queue {
    const inventoriesUpdateDLQ = new sqs.Queue(
      this,
      "HalInventoriesUpdatesDLQ",
      {
        queueName: "HalInventoriesUpdatesDLQ",
        retentionPeriod: cdk.Duration.hours(10),
      }
    );
    const inventoriesUpdateQueue = new sqs.Queue(
      this,
      "HalInventoriesUpdatesQueue",
      {
        queueName: "HalInventoriesUpdatesQueue",
        visibilityTimeout: cdk.Duration.minutes(2),
        retentionPeriod: cdk.Duration.days(1),
        deadLetterQueue: {
          queue: inventoriesUpdateDLQ,
          maxReceiveCount: 4,
        },
      }
    );
    inventoriesUpdateQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("s3.amazonaws.com")],
        actions: ["sqs:SendMessage"],
        resources: [inventoriesUpdateQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            // Allows all buckets to send notifications since we haven't created the bucket yet.
            "aws:SourceArn": "arn:aws:s3:*:*:*",
          },
        },
      })
    );
    return inventoriesUpdateQueue;
  }
  createPricesUpdateQueue(): cdk.aws_sqs.Queue {
    const pricesUpdateDLQ = new sqs.Queue(this, "HalPricesUpdatesDLQ", {
      queueName: "HalPricesUpdatesDLQ",
      retentionPeriod: cdk.Duration.hours(10),
    });
    const pricesUpdateQueue = new sqs.Queue(this, "HalPricesUpdatesQueue", {
      queueName: "HalPricesUpdatesQueue",
      visibilityTimeout: cdk.Duration.minutes(2),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: pricesUpdateDLQ,
        maxReceiveCount: 4,
      },
    });
    pricesUpdateQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("s3.amazonaws.com")],
        actions: ["sqs:SendMessage"],
        resources: [pricesUpdateQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            // Allows all buckets to send notifications since we haven't created the bucket yet.
            "aws:SourceArn": "arn:aws:s3:*:*:*",
          },
        },
      })
    );
    return pricesUpdateQueue;
  }
  createInventoryBucket(): cdk.aws_s3.Bucket {
    const inventoryBucket = new s3.Bucket(this, "HalInventory", {
      bucketName: `hal-inventory-${this.account}`,
      autoDeleteObjects: false,
      versioned: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(60),
            },
            {
              storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });
    return inventoryBucket;
  }
  createPriceBucket(): cdk.aws_s3.Bucket {
    const pricebucket = new s3.Bucket(this, "HalPrice", {
      bucketName: `hal-price-${this.account}`,
      autoDeleteObjects: false,
      versioned: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(60),
            },
            {
              storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });
    return pricebucket;
  }
  createHalPriceGroup(pricebucket: cdk.aws_s3.Bucket): cdk.aws_iam.Group {
    const group = new iam.Group(this, "HalPriceGroup", {
      groupName: "HalPriceGroup",
    });
    group.attachInlinePolicy(
      new iam.Policy(this, "HalPriceGroupPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetBucketLocation", "s3:ListAllMyBuckets"],
            resources: ["arn:aws:s3:::*"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:ListBucket"],
            resources: [pricebucket.bucketArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:*Object"],
            resources: [`${pricebucket.bucketArn}/*`],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ["s3:DeleteObject"],
            resources: [`${pricebucket.bucketArn}/*`],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ["s3:PutObject*"],
            notResources: [
              `${pricebucket.bucketArn}/*.xlsx`,
              `${pricebucket.bucketArn}/*.xls`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ["s3:PutObject*"],
            notResources: [`${pricebucket.bucketArn}/istanbul/produce/input/*`],
          }),
        ],
      })
    );
    return group;
  }
  createInventoryTable(): cdk.aws_dynamodb.Table {
    const halInventoryTable = new dynamodb.Table(this, "HalInventoryTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "HalInventory",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      partitionKey: {
        name: "InventoryType",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "InventoryId",
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
    });
    return halInventoryTable;
  }
  createPriceTable(): cdk.aws_dynamodb.Table {
    const priceTable = new dynamodb.Table(this, "HalPricesDB", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "HalPrice",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      partitionKey: {
        name: "ProductId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "TS",
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
    });
    priceTable.addGlobalSecondaryIndex({
      indexName: "PriceLocationIndex",
      partitionKey: {
        name: "Location",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "TS",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    return priceTable;
  }
  createListingApiGateway(): cdk.aws_apigateway.RestApi {
    const listingApi = new apigateway.RestApi(this, "HalAppListingApi", {
      description: "HalApp Api Gateway",
    });
    return listingApi;
  }
}
