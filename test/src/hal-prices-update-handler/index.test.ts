import * as fs from "fs";
import "reflect-metadata";
import { S3Service } from "../../../src/services/s3.service";
import * as path from "path";
import { S3CreateEvent, SQSEvent } from "aws-lambda";
import { diContainer } from "../../../src/core/di-registry";

describe("HalPricesUpdateHandler", () => {
  test("Get Correct Object Information From SQS Event", () => {
    const sqsEventBuff = fs.readFileSync(
      path.join(__dirname, "../../assests/sqs-event.json")
    );
    var sqsEvent = JSON.parse(sqsEventBuff.toString()) as SQSEvent;
    const service = diContainer.resolve(S3Service);
    const list = service.parseS3CreateEvent(
      JSON.parse(sqsEvent.Records[0].body) as S3CreateEvent
    );
    const { bucket, fileExtension, fileName, key } = list[0];
    expect(bucket).toEqual("hal-price-751021557844");
    expect(key).toEqual("istanbul/produce/input/greens.xlsx");
  });
  test("Throw Exception If Information From SQS Event Is Wrong", () => {
    const sqsEventBuff = fs.readFileSync(
      path.join(__dirname, "../../assests/sqs-event-wrong.json")
    );
    var sqsEvent = JSON.parse(sqsEventBuff.toString()) as SQSEvent;
    const service = diContainer.resolve(S3Service);
    const list = service.parseS3CreateEvent(
      JSON.parse(sqsEvent.Records[0].body) as S3CreateEvent
    );
    expect(list.length).toBe(1);
  });
});
