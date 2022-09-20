import * as moment from 'moment-timezone'
import * as ExcelJS from 'exceljs'
import { S3CreateEvent, SQSEvent, SQSRecord } from 'aws-lambda';
import { GetObjectCommand, S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, } from '@aws-sdk/client-dynamodb'
import { Product } from '../models/product';
import { Stream } from 'stream';
import { ProductToPriceEntryDTOMapper } from '../mappers/product-to-price-entry-dto.mapper'
import { ProductToExcelInputDTOMapper } from '../mappers/product-to-excel-input-dto.mapper'
import { ExcelInputDTO } from '../models/excel-input-dto';
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";


const s3Client = new S3Client({})
const docClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(docClient)


export async function handler(event: SQSEvent) {
    console.log(JSON.stringify(event, null, 2));
    const timezone = moment.tz("Europe/Istanbul").format()

    for (const record of event.Records) {
        const [bucket, key, location, type, object] = getObjectInfo(record)
        const toProductMapper = new ProductToExcelInputDTOMapper(location, type, timezone)
        const fileStream = await getS3FileStream(bucket, key);
        // Process File 
        const excelInputList = await readExcelFile(fileStream);
        // Insert to DynamoDB
        await insertIntoPricesDB(excelInputList.map(e => toProductMapper.toModal(e)));
        // Move File To Archive
        await moveFileToAnotherFolder(bucket, key, `${location}/${type}/archive/${timezone}`)
    }
}

export async function getS3FileStream(bucket: string, key: string): Promise<Stream> {
    console.log(`Bucket and Key :`, JSON.stringify({ bucket, key }, null, 2));
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key })
    const { Body } = await s3Client.send(getObjectCommand);
    return Body as Stream
}
export function getObjectInfo(record: SQSRecord): [string, string, string, string, string] {
    const recordBody = record.body;
    const s3CreateEvent = JSON.parse(recordBody) as S3CreateEvent
    const bucket = s3CreateEvent.Records[0].s3.bucket.name;
    let key = s3CreateEvent.Records[0].s3.object.key;
    key = key.replace(/\+/g, ' '); // decode plus sign back to space
    key = decodeURIComponent(key);
    const [location, type, object] = key.split("/")
    return [bucket, key, location, type, object]
}
export async function readExcelFile(fileStream: Stream): Promise<ExcelInputDTO[]> {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(fileStream, {
        worksheets: 'emit',
        sharedStrings: "cache"
    });
    const excelInputList: ExcelInputDTO[] = []
    for await (const worksheetReader of workbookReader) {
        for await (const row of worksheetReader) {
            if (row.number === 1) {
                // skip header
                continue;
            }
            const productId = row.getCell(1).text;
            const productName = row.getCell(2).text;
            const price = row.getCell(3).text;
            const unit = row.getCell(4).text
            if (price && !isNaN(+price)) {
                excelInputList.push({
                    ProductId: productId,
                    ProductName: productName,
                    Price: Number(price),
                    Unit: unit,
                })
            }
        }
    }
    return excelInputList
}
export async function insertIntoPricesDB(products: Product[]): Promise<void> {
    const mapper = new ProductToPriceEntryDTOMapper()
    const chunks = chuckArray(products, 25);
    for (const chunk of chunks) {
        const priceEntries = chunk.map(c => mapper.toDTO(c)).map(entry => Object.assign({ PutRequest: { Item: entry } }))
        console.log(`Price Entries :`, JSON.stringify({ priceEntries }, null, 2));
        const command = new BatchWriteCommand({
            RequestItems: {
                "HalPrices": priceEntries
            },
        })
        await documentClient.send(command);
    }
}
export function chuckArray(products: Product[], chunkSize: number): Product[][] {
    return Array.from({ length: Math.ceil(products.length / chunkSize) },
        (_, index) => products.slice(index * chunkSize, (index + 1) * chunkSize))
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