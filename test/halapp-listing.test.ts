import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as HalappListing from "../lib/halapp-listing-stack";

// example test. To run these tests, uncomment this file along with the
// example resource in lib/halapp-listing-stack.ts
test("SQS Queue Created", () => {
  const app = new cdk.App();
  //     // WHEN
  const stack = new HalappListing.HalappListingStack(app, "MyTestStack");
  //     // THEN
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::SQS::Queue", 2);
});
