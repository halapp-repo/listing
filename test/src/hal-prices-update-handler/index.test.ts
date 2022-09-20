import * as fs from 'fs';
import { readExcelFile, chuckArray, getObjectInfo } from '../../../src/hal-prices-update-handler'
import * as path from 'path'
import { SQSEvent } from 'aws-lambda';


describe("HalPricesUpdateHandler", () => {
    test("Return Correct Number Of Products", async () => {
        // Read file
        const readable = fs.createReadStream(path.join(__dirname, '../../assests/produce.xlsx'));
        const recordList = await readExcelFile(readable)
        expect(recordList.length).toEqual(7)
    })
    test("Return Correct Number Of Chunk", () => {
        const array = new Array(76)
        const chunks = chuckArray(array, 25)
        expect(chunks.length).toEqual(4)
    })
    test("Get Correct Object Information From SQS Event", () => {
        const sqsEventBuff = fs.readFileSync(path.join(__dirname, '../../assests/sqs-event.json'));
        var sqsEvent = JSON.parse(sqsEventBuff.toString()) as SQSEvent;
        const [bucket, key, location, type] = getObjectInfo(sqsEvent.Records[0])
        expect(bucket).toEqual("hal-price-751021557844")
        expect(key).toEqual("istanbul/produce/input/greens.xlsx")
        expect(location).toEqual("istanbul")
        expect(type).toEqual("produce")
    })
})