import "reflect-metadata";
import * as moment from "moment-timezone";
import { S3CreateEvent, SQSEvent, SQSRecord } from "aws-lambda";
import { InventoryExcelService } from "../services/inventory-excel.service";
import { InventoryService } from "../services/inventory.service";
import { diContainer } from "../core/di-registry";
import { S3Service } from "../services/s3.service";

export async function handler(event: SQSEvent) {
  console.log(JSON.stringify(event, null, 2));
  const currentTimestamp = moment.tz("Europe/Istanbul").format();
  const inventoryService = diContainer.resolve(InventoryService);
  const excelService = diContainer.resolve(InventoryExcelService);
  const s3Service = diContainer.resolve(S3Service);
  for (const record of event.Records) {
    const { body } = record;
    for (const recordInfo of s3Service.parseS3CreateEvent(
      JSON.parse(body) as S3CreateEvent
    )) {
      const {
        bucket: Bucket,
        fileExtension: FileExtension,
        fileName: FileName,
        key: Key,
      } = recordInfo;
      const fileStream = await s3Service.readObject(Bucket, Key);
      // Process File
      const itemList = await excelService.read(fileStream);
      // Insert to DynamoDB
      await inventoryService.updateDB(itemList);
      // Move File To Archive
      await s3Service.moveObject(
        Bucket,
        Key,
        `archive/${currentTimestamp}_${FileName}.${FileExtension}`
      );
    }
  }
}
