import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import { NodejsFunction, LogLevel } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { SqsEventSource, } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';



export class HalappListingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // *************
    // Create Queue
    // *************
    const pricesUpdateQueue = new sqs.Queue(this, 'HalPricesUpdatesQueue', {
      queueName: "HalPricesUpdatesQueue",
      visibilityTimeout: cdk.Duration.minutes(2),
    });
    pricesUpdateQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('s3.amazonaws.com')],
        actions: ["sqs:SendMessage"],
        resources: [pricesUpdateQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            // Allows all buckets to send notifications since we haven't created the bucket yet.
            "aws:SourceArn": "arn:aws:s3:*:*:*"
          }
        }
      })
    )
    // **************
    // Create Bucket
    // **************
    const pricebucket = new s3.Bucket(this, 'HalPrice', {
      bucketName: `hal-price-${this.account}`,
      autoDeleteObjects: false,
      versioned: true,
      lifecycleRules: [{
        transitions: [
          {
            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
            transitionAfter: cdk.Duration.days(60)
          },
          {
            storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
            transitionAfter: cdk.Duration.days(90)
          }
        ]
      }]
    })
    pricebucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(pricesUpdateQueue), {
      prefix: "istanbul/produce/input/"
    })
    // **************
    // Create Group
    // **************
    const group = new iam.Group(this, "HalPriceGroup", {
      groupName: "HalPriceGroup",
    })
    group.attachInlinePolicy(new iam.Policy(this, 'HalPriceGroupPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:GetBucketLocation", "s3:ListAllMyBuckets"],
          resources: ["arn:aws:s3:::*"]
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
          resources: [`${pricebucket.bucketArn}/*`]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["s3:PutObject*"],
          notResources: [
            `${pricebucket.bucketArn}/*.xlsx`,
            `${pricebucket.bucketArn}/*.xls`
          ]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["s3:PutObject*"],
          notResources: [
            `${pricebucket.bucketArn}/istanbul/produce/input/*`,
          ]
        })
      ]
    }))
    // *****************
    // Create DynamoDB
    // ******************
    const halPricesTable = new dynamodb.Table(this, 'HalPricesDB', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "HalPrices",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      partitionKey: {
        name: 'ProductId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'TS',
        type: dynamodb.AttributeType.STRING
      },
      pointInTimeRecovery: true,
    })
    halPricesTable.addGlobalSecondaryIndex({
      indexName: "PriceLocationIndex",
      partitionKey: {
        name: "Location",
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'TS',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL,
    })



    // ********************
    // Create API Gateway
    // ********************
    const listingApi = new apigateway.RestApi(this, 'HalAppListingApi', {
      description: "HalApp Api Gateway",
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowOrigins: [
          'https://halapp.io',
          // 'https://halapp.com',
          'https://halapp.com.tr'],
      }
    })
    const listingApiValidator = listingApi.addRequestValidator('HalAppListingApiValidator', {
      requestValidatorName: "HalAppListingApiValidator",
      validateRequestParameters: true
    })
    // ***************************
    // Create Lambda Handler
    // ***************************
    //
    // ****Create SQS Handler Lambda****
    //
    const pricesUpdateHandler = new NodejsFunction(this, 'SqsHalPricesUpdateHandler', {
      memorySize: 1024,
      timeout: cdk.Duration.minutes(1),
      functionName: 'SqsHalPricesUpdateHandler',
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/hal-prices-update-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true,
      },
    });
    pricesUpdateHandler.addEventSource(
      new SqsEventSource(pricesUpdateQueue, {
        batchSize: 1,
      }),
    );
    halPricesTable.grantWriteData(pricesUpdateHandler)
    pricebucket.grantReadWrite(pricesUpdateHandler)
    //
    // ****PRODUCTS API Handler****
    //
    const products = listingApi.root.addResource('products')
    const getProductsHandler = new NodejsFunction(this, 'ListingGetProductsHandler', {
      memorySize: 1024,
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: 'ListingGetProductsHandler',
      handler: 'handler',
      timeout: cdk.Duration.seconds(15),
      entry: path.join(__dirname, `/../src/listing-get-products-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true,
      },
    });
    products.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsHandler, { proxy: true }),
      {
        requestParameters: {
          "method.request.querystring.location": true,
          "method.request.querystring.type": true,
          "method.request.querystring.date": false
        },
        requestValidator: listingApiValidator,
      }
    );
    halPricesTable.grantReadData(getProductsHandler)
    //
    // PRICES API Handler
    //
    const prices = listingApi.root.addResource('prices')
    const getPricesHandler = new NodejsFunction(this, 'ListingGetPricesHandler', {
      memorySize: 1024,
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: 'ListingGetPricesHandler',
      handler: 'handler',
      timeout: cdk.Duration.seconds(15),
      entry: path.join(__dirname, `/../src/listing-get-prices-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true,
      },
    });
    prices.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPricesHandler, { proxy: true }),
      {
        requestParameters: {
          "method.request.querystring.product_id": true,
          "method.request.querystring.duration": true
        },
        requestValidator: listingApiValidator,
      }
    );
    halPricesTable.grantReadData(getPricesHandler)
    // ********************
    // Create EventBridge
    // ********************

  }
}
