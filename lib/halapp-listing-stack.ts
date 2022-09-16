import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { SqsEventSource, } from 'aws-cdk-lib/aws-lambda-event-sources';



export class HalappListingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // *************
    // Create Queue
    // *************
    const pricesUpdateQueue = new sqs.Queue(this, 'HalPricesUpdatesQueue', {
      queueName: "HalPricesUpdatesQueue",
      visibilityTimeout: cdk.Duration.minutes(2)
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
      new s3n.SqsDestination(pricesUpdateQueue)
    )
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
          resources: [pricebucket.bucketArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:*Object"],
          resources: [`${pricebucket.bucketArn}/*`]
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
        })
      ]
    }))
    const user = new iam.User(this, 'Halci', {
      userName: "halciM"
    });
    group.addUser(user)
    // **************
    // Create Lambda
    // **************
    const pricesUpdateHandler = new NodejsFunction(this, 'SqsHalPricesUpdateHandler', {
      memorySize: 1024,
      timeout: cdk.Duration.minutes(1),
      functionName: 'SqsHalPricesUpdateHandler',
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/hal-prices-update-handler/index.ts`),
    });
    pricesUpdateHandler.addEventSource(
      new SqsEventSource(pricesUpdateQueue, {
        batchSize: 1,
      }),
    );

  }
}
