import * as fs from 'fs';
import { getObjectInfo } from '../../../src/hal-prices-update-handler'
import * as path from 'path'
import { SQSEvent } from 'aws-lambda';


describe("HalPricesUpdateHandler", () => {

    test("Get Correct Object Information From SQS Event", () => {
        const sqsEventBuff = fs.readFileSync(path.join(__dirname, '../../assests/sqs-event.json'));
        var sqsEvent = JSON.parse(sqsEventBuff.toString()) as SQSEvent;
        const [bucket, key, location, type] = getObjectInfo(sqsEvent.Records[0])
        expect(bucket).toEqual("hal-price-751021557844")
        expect(key).toEqual("istanbul/produce/input/greens.xlsx")
        expect(location).toEqual("istanbul")
        expect(type).toEqual("produce")
    })
    test("Throw Exception If Information From SQS Event Is Wrong", () => {
        const sqsEventBuff = fs.readFileSync(path.join(__dirname, '../../assests/sqs-event-wrong.json'));
        var sqsEvent = JSON.parse(sqsEventBuff.toString()) as SQSEvent;
        expect(() => getObjectInfo(sqsEvent.Records[0])).toThrow(Error);
    })
})