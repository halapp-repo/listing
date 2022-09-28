import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { S3CreateEvent } from "aws-lambda";
import { Stream } from "stream";
import { inject, injectable } from "tsyringe";
import { S3Store } from "../repositories/s3-store";
import * as path from "path";

export interface S3RecordInfo {
  bucket: string;
  key: string;
  fileName: string;
  fileExtension: string;
}

@injectable()
export class S3Service {
  constructor(
    @inject("S3Store")
    private store: S3Store
  ) {}
  async readObject(bucket: string, key: string): Promise<Stream> {
    console.log(`Bucket and Key :`, JSON.stringify({ bucket, key }, null, 2));
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const { Body } = await this.store.s3Client.send(getObjectCommand);
    return Body as Stream;
  }
  async moveObject(bucket: string, from: string, to: string): Promise<void> {
    console.log("Move File");
    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${from}`,
      Key: `${to}`,
    });
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: `${from}`,
    });
    console.log("CopyCommand", JSON.stringify(copyCommand, null, 2));
    console.log("DeleteCommand", JSON.stringify(deleteCommand, null, 2));
    await this.store.s3Client.send(copyCommand);
    await this.store.s3Client.send(deleteCommand);
  }
  parseS3CreateEvent(event: S3CreateEvent): S3RecordInfo[] {
    const recordList: S3RecordInfo[] = [];
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      let key = record.s3.object.key;
      key = key.replace(/\+/g, " "); // decode plus sign back to space
      key = decodeURIComponent(key);
      const { ext, name } = path.parse(key);
      recordList.push({
        bucket: bucket,
        fileName: name,
        fileExtension: ext,
        key: key,
      });
    }
    return recordList;
  }
}
