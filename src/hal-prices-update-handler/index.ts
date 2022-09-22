import * as moment from 'moment-timezone'
import { Stream } from 'stream';
import { S3CreateEvent, SQSEvent, SQSRecord } from 'aws-lambda';
import { GetObjectCommand, S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { PriceToPriceInputDTOMapper as PrToPrInMapper } from '../mappers/price-to-price-input-dto.mapper';
import { PriceExcelService } from '../services/price-excel.service'
import PricesRepository from '../repositories/prices.repository';
import { PriceToPriceRepositoryDTOMapper as PrToPrRepoMapper } from '../mappers/price-to-price-repository-dto.mapper'
import { LocationType } from '../models/location-type';
import { ProductType } from '../models/product-type-type';


const s3Client = new S3Client({})
const docClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(docClient)


export async function handler(event: SQSEvent) {

    console.log(JSON.stringify(event, null, 2));
    const currentTimestamp = moment.tz("Europe/Istanbul").format()
    console.log(`HalPricesUpdateHandler is called at ${currentTimestamp}`)
    const repo = new PricesRepository(documentClient, new PrToPrRepoMapper())
    for (const record of event.Records) {
        const [bucket, key, location, type] = getObjectInfo(record)
        const excelService = new PriceExcelService(new PrToPrInMapper(location, type, currentTimestamp))
        const fileStream = await getS3FileStream(bucket, key);
        // Process File 
        const priceList = await excelService.read(fileStream);
        // Insert to DynamoDB
        await repo.createPrices(priceList);
        // Move File To Archive
        await moveFileToAnotherFolder(bucket, key, `${location}/${type}/archive/${currentTimestamp}`)
    }
}

export async function getS3FileStream(bucket: string, key: string): Promise<Stream> {
    console.log(`Bucket and Key :`, JSON.stringify({ bucket, key }, null, 2));
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key })
    const { Body } = await s3Client.send(getObjectCommand);
    return Body as Stream
}
export function getObjectInfo(record: SQSRecord): [string, string, LocationType, ProductType] {
    const recordBody = record.body;
    const s3CreateEvent = JSON.parse(recordBody) as S3CreateEvent
    const bucket = s3CreateEvent.Records[0].s3.bucket.name;
    let key = s3CreateEvent.Records[0].s3.object.key;
    key = key.replace(/\+/g, ' '); // decode plus sign back to space
    key = decodeURIComponent(key);
    const [location, type] = key.split("/")
    console.log("Processing object is ", JSON.stringify({ location, type, key }, null, 2))
    const locationType = LocationType[location as keyof typeof LocationType]
    const productType = ProductType[type as keyof typeof ProductType]
    if (!bucket) {
        throw new Error("Bucket is not defined")
    }
    if (!key) {
        throw new Error("Key is not defined")
    }
    if (!locationType) {
        throw new Error("Location type is not defined")
    }
    if (!productType) {
        throw new Error("Product type is not defined")
    }
    return [bucket, key, locationType, productType]
}

export async function moveFileToAnotherFolder(fromBucket: string, fromKey: string, toKey: string): Promise<void> {
    console.log("Move File")
    const copyCommand = new CopyObjectCommand({
        Bucket: fromBucket,
        CopySource: `${fromBucket}/${fromKey}`,
        Key: `${toKey}`
    })
    const deleteCommand = new DeleteObjectCommand({
        Bucket: fromBucket,
        Key: `${fromKey}`
    })
    console.log("CopyCommand", JSON.stringify(copyCommand, null, 2))
    console.log("DeleteCommand", JSON.stringify(deleteCommand, null, 2))
    await s3Client.send(copyCommand)
    await s3Client.send(deleteCommand)
}