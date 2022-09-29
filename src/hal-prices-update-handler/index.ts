import "reflect-metadata";
import * as moment from "moment-timezone";
import { S3CreateEvent, SQSEvent } from "aws-lambda";
import { PriceExcelService } from "../services/price-excel.service";
import PriceRepository from "../repositories/price.repository";
import { LocationType } from "../models/location-type";
import { ProductType } from "../models/product-type-type";
import { diContainer } from "../core/di-registry";
import { S3Service } from "../services/s3.service";

export async function handler(event: SQSEvent) {
  console.log(JSON.stringify(event, null, 2));
  const currentTimestamp = moment.tz("Europe/Istanbul").format();
  console.log(`HalPricesUpdateHandler is called at ${currentTimestamp}`);
  const repo = diContainer.resolve(PriceRepository);
  const excelService = diContainer.resolve(PriceExcelService);
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
      const [location, type] = Key.split("/");
      const locationType = LocationType[location as keyof typeof LocationType];
      const productType = ProductType[type as keyof typeof ProductType];
      excelService.setLocationType(locationType);
      excelService.setProductType(productType);
      excelService.setTimeStamp(currentTimestamp);
      const fileStream = await s3Service.readObject(Bucket, Key);
      // Process File
      const priceList = await excelService.read(fileStream);
      // Insert to DynamoDB
      await repo.createPrices(priceList);
      // Move File To Archive
      await s3Service.moveObject(
        Bucket,
        Key,
        `${locationType}/${productType}/archive/${currentTimestamp}_${FileName}${FileExtension}`
      );
    }
  }
}
