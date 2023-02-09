import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { NodejsFunction, LogLevel } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import getConfig from '../config';
import { BuildConfig } from './build-config';
import * as apiGateway from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apiGatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

export class HalappListingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    //*****************
    // BUILD CONFIG
    //******************
    const buildConfig = getConfig(scope as cdk.App);
    // *************
    // Create SQS
    // *************
    const inventoriesUpdateQueue = this.createInventoriesUpdateQueue(buildConfig);
    const pricesUpdateQueue = this.createPricesUpdateQueue(buildConfig);
    // **************
    // Create Bucket
    // **************
    const inventoryBucket = this.createInventoryBucket(buildConfig, inventoriesUpdateQueue);
    const pricebucket = this.createPriceBucket(buildConfig, pricesUpdateQueue);
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
    const listingApi = this.createListingApiGateway(buildConfig);
    // ***************************
    // Create LAMBDA Handler
    // ***************************
    //
    // ****Create SQS Handler Lambda****
    //
    this.createInventoriesUpdatedHandler(
      buildConfig,
      inventoriesUpdateQueue,
      inventoryTable,
      inventoryBucket
    );
    this.createPricesUpdateHandler(buildConfig, pricesUpdateQueue, priceTable, pricebucket);
    //
    // ****PRODUCTS API Handler****
    //
    this.createGetProductPricesHandler(buildConfig, listingApi, priceTable);
    //
    // ****INVENTORY API Handler****
    //
    this.createGetInventoriesHandler(buildConfig, listingApi, inventoryTable);
    //
    // ****PRICES API Handler****
    //
    this.createGetPricesHandler(buildConfig, listingApi, priceTable);
  }
  createInventoriesUpdateQueue(buildConfig: BuildConfig): cdk.aws_sqs.Queue {
    const inventoriesUpdateDLQ = new sqs.Queue(this, 'HalInventoriesUpdatesDLQ', {
      queueName: `${buildConfig.SQSInventoriesUpdatedQueue}DLQ`,
      retentionPeriod: cdk.Duration.hours(10)
    });
    const inventoriesUpdateQueue = new sqs.Queue(this, 'HalInventoriesUpdatesQueue', {
      queueName: `${buildConfig.SQSInventoriesUpdatedQueue}`,
      visibilityTimeout: cdk.Duration.minutes(2),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: inventoriesUpdateDLQ,
        maxReceiveCount: 4
      }
    });
    inventoriesUpdateQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('s3.amazonaws.com')],
        actions: ['sqs:SendMessage'],
        resources: [inventoriesUpdateQueue.queueArn],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': this.account
          },
          ArnLike: {
            // Allows all buckets to send notifications since we haven't created the bucket yet.
            'aws:SourceArn': 'arn:aws:s3:*:*:*'
          }
        }
      })
    );
    return inventoriesUpdateQueue;
  }
  createPricesUpdateQueue(buildConfig: BuildConfig): cdk.aws_sqs.Queue {
    const pricesUpdateDLQ = new sqs.Queue(this, 'HalPricesUpdatesDLQ', {
      queueName: `${buildConfig.SQSPricesUpdatedQueue}DLQ`,
      retentionPeriod: cdk.Duration.hours(10)
    });
    const pricesUpdateQueue = new sqs.Queue(this, 'HalPricesUpdatesQueue', {
      queueName: `${buildConfig.SQSPricesUpdatedQueue}`,
      visibilityTimeout: cdk.Duration.minutes(2),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: pricesUpdateDLQ,
        maxReceiveCount: 4
      }
    });
    pricesUpdateQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('s3.amazonaws.com')],
        actions: ['sqs:SendMessage'],
        resources: [pricesUpdateQueue.queueArn],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': this.account
          },
          ArnLike: {
            // Allows all buckets to send notifications since we haven't created the bucket yet.
            'aws:SourceArn': 'arn:aws:s3:*:*:*'
          }
        }
      })
    );
    return pricesUpdateQueue;
  }
  createInventoryBucket(
    buildConfig: BuildConfig,
    inventoryQueue: cdk.aws_sqs.Queue
  ): cdk.aws_s3.Bucket {
    const inventoryBucket = new s3.Bucket(this, 'HalInventory', {
      bucketName: `hal-inventory-${this.account}`,
      autoDeleteObjects: false,
      versioned: true,
      lifecycleRules: [
        {
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
        }
      ]
    });
    inventoryBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(inventoryQueue)
    );
    return inventoryBucket;
  }
  createPriceBucket(buildConfig: BuildConfig, priceQueue: cdk.aws_sqs.Queue): cdk.aws_s3.Bucket {
    const pricebucket = new s3.Bucket(this, 'HalPrice', {
      bucketName: `hal-price-${this.account}`,
      autoDeleteObjects: false,
      versioned: true,
      lifecycleRules: [
        {
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
        }
      ]
    });
    pricebucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(priceQueue),
      {
        prefix: 'istanbul/produce/input/'
      }
    );
    return pricebucket;
  }
  createHalPriceGroup(pricebucket: cdk.aws_s3.Bucket): cdk.aws_iam.Group {
    const group = new iam.Group(this, 'HalPriceGroup', {
      groupName: 'HalPriceGroup'
    });
    group.attachInlinePolicy(
      new iam.Policy(this, 'HalPriceGroupPolicy', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetBucketLocation', 's3:ListAllMyBuckets'],
            resources: ['arn:aws:s3:::*']
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:ListBucket'],
            resources: [pricebucket.bucketArn]
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*Object'],
            resources: [`${pricebucket.bucketArn}/*`]
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ['s3:DeleteObject'],
            resources: [`${pricebucket.bucketArn}/*`]
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ['s3:PutObject*'],
            notResources: [`${pricebucket.bucketArn}/*.xlsx`, `${pricebucket.bucketArn}/*.xls`]
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ['s3:PutObject*'],
            notResources: [`${pricebucket.bucketArn}/istanbul/produce/input/*`]
          })
        ]
      })
    );
    return group;
  }
  createInventoryTable(): cdk.aws_dynamodb.Table {
    const halInventoryTable = new dynamodb.Table(this, 'HalInventoryTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: 'HalInventory',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      partitionKey: {
        name: 'InventoryType',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'InventoryId',
        type: dynamodb.AttributeType.STRING
      },
      pointInTimeRecovery: true
    });
    return halInventoryTable;
  }
  createPriceTable(): cdk.aws_dynamodb.Table {
    const priceTable = new dynamodb.Table(this, 'HalPricesDB', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: 'HalPrice',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      partitionKey: {
        name: 'ProductId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'TS',
        type: dynamodb.AttributeType.STRING
      },
      pointInTimeRecovery: true
    });
    priceTable.addGlobalSecondaryIndex({
      indexName: 'PriceLocationIndex',
      partitionKey: {
        name: 'Location',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'TS',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });
    priceTable.addGlobalSecondaryIndex({
      indexName: 'PriceActiveIndex',
      partitionKey: {
        name: 'Active',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });
    return priceTable;
  }
  createListingApiGateway(buildConfig: BuildConfig): apiGateway.HttpApi {
    const listingApi = new apiGateway.HttpApi(this, 'HalAppListingApi', {
      description: 'HalApp Listing Api Gateway',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowMethods: [
          apiGateway.CorsHttpMethod.GET,
          apiGateway.CorsHttpMethod.HEAD,
          apiGateway.CorsHttpMethod.OPTIONS
        ],
        allowOrigins:
          buildConfig.Environment === 'PRODUCTION'
            ? ['https://halapp.io', 'https://www.halapp.io']
            : ['*']
      }
    });
    return listingApi;
  }
  createInventoriesUpdatedHandler(
    buildConfig: BuildConfig,
    inventoriesUpdateQueue: cdk.aws_sqs.Queue,
    inventoryTable: cdk.aws_dynamodb.Table,
    inventoryBucket: cdk.aws_s3.Bucket
  ) {
    const inventoriesUpdateHandler = new NodejsFunction(this, 'SqsHalInventoriesUpdateHandler', {
      memorySize: 1024,
      timeout: cdk.Duration.minutes(1),
      functionName: 'Listing-SqsInventoriesUpdateHandler',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/hal-inventories-update-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        Region: buildConfig.Region
      }
    });
    inventoriesUpdateHandler.addEventSource(
      new SqsEventSource(inventoriesUpdateQueue, {
        batchSize: 1
      })
    );
    inventoryTable.grantReadWriteData(inventoriesUpdateHandler);
    inventoryBucket.grantReadWrite(inventoriesUpdateHandler);
  }
  createPricesUpdateHandler(
    buildConfig: BuildConfig,
    pricesUpdateQueue: cdk.aws_sqs.Queue,
    pricesTable: cdk.aws_dynamodb.Table,
    priceBucket: cdk.aws_s3.Bucket
  ) {
    const pricesUpdateHandler = new NodejsFunction(this, 'SqsHalPricesUpdateHandler', {
      memorySize: 1024,
      timeout: cdk.Duration.minutes(1),
      functionName: 'Listing-SqsPricesUpdateHandler',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/hal-prices-update-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        Region: buildConfig.Region
      }
    });
    pricesUpdateHandler.addEventSource(
      new SqsEventSource(pricesUpdateQueue, {
        batchSize: 1
      })
    );
    pricesTable.grantReadWriteData(pricesUpdateHandler);
    priceBucket.grantReadWrite(pricesUpdateHandler);
  }
  createGetProductPricesHandler(
    buildConfig: BuildConfig,
    listingApi: apiGateway.HttpApi,
    pricesTable: cdk.aws_dynamodb.Table
  ) {
    const getProductPricesHandler = new NodejsFunction(this, 'ListingGetProductPricesHandler', {
      memorySize: 1024,
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: 'Listing-GetProductPricesHandler',
      handler: 'handler',
      timeout: cdk.Duration.seconds(15),
      entry: path.join(__dirname, `/../src/listing-get-product-prices-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        Region: buildConfig.Region
      }
    });
    listingApi.addRoutes({
      methods: [HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        'getProductPriceHandlerIntegration',
        getProductPricesHandler
      ),
      path: '/products/{productId}/prices'
    });
    pricesTable.grantReadData(getProductPricesHandler);
    return getProductPricesHandler;
  }
  createGetInventoriesHandler(
    buildConfig: BuildConfig,
    listingApi: apiGateway.HttpApi,
    inventoryTable: cdk.aws_dynamodb.Table
  ) {
    const getInventoriesHandler = new NodejsFunction(this, 'ListingGetInventoriesHandler', {
      memorySize: 1024,
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: 'Listing-GetInventoriesHandler',
      handler: 'handler',
      timeout: cdk.Duration.seconds(15),
      entry: path.join(__dirname, `/../src/listing-get-inventories-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        Region: buildConfig.Region
      }
    });
    listingApi.addRoutes({
      methods: [HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        'getInventoryHandlerIntegration',
        getInventoriesHandler
      ),
      path: '/inventories'
    });
    inventoryTable.grantReadData(getInventoriesHandler);
  }
  createGetPricesHandler(
    buildConfig: BuildConfig,
    listingApi: apiGateway.HttpApi,
    pricesTable: cdk.aws_dynamodb.Table
  ) {
    const getPricesHandler = new NodejsFunction(this, 'ListingGetPricesHandler', {
      memorySize: 1024,
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: 'Listing-GetPricesHandler',
      handler: 'handler',
      timeout: cdk.Duration.seconds(15),
      entry: path.join(__dirname, `/../src/listing-get-prices-handler/index.ts`),
      bundling: {
        target: 'es2020',
        keepNames: true,
        logLevel: LogLevel.INFO,
        sourceMap: true,
        minify: true
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        Region: buildConfig.Region
      }
    });
    listingApi.addRoutes({
      methods: [HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        'getPricesHandlerIntegration',
        getPricesHandler
      ),
      path: '/prices'
    });
    pricesTable.grantReadData(getPricesHandler);
  }
}
