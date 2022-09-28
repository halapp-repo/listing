import { BatchWriteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { inject, injectable } from "tsyringe";
import { IMapper } from "../mappers/base.mapper";
import { PriceRepositoryDTO } from "../models/dtos/price.repository.dto";
import { DurationType } from "../models/duration-type";
import { LocationType } from "../models/location-type";
import { Price } from "../models/price";
import { ProductType } from "../models/product-type-type";
import { chuckArray } from "../utils/array.utils";
import { DynamoStore } from "./dynamo-store";

@injectable()
export default class PriceRepository {
  private tableName = "HalPrice";
  private chunkSize = 25;
  constructor(
    @inject("DBStore")
    private store: DynamoStore,
    @inject("PrToPrRepoMapper")
    private mapper: IMapper<Price, PriceRepositoryDTO>
  ) {}
  async createPrices(prices: Price[]): Promise<void> {
    console.log("Inserting Price Entries");
    if (!prices || prices.length == 0) {
      console.warn("There Is No Price To Enter");
      return;
    }
    const priceDtoList = this.mapper.toListDTO(prices);
    for (const chunk of chuckArray(priceDtoList, this.chunkSize)) {
      const priceEntries = chunk.map((entry) =>
        Object.assign({ PutRequest: { Item: entry } })
      );
      console.log(`Price Entries :`, JSON.stringify({ priceEntries }, null, 2));
      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: priceEntries,
        },
      });
      await this.store.dynamoClient.send(command);
    }
  }
  async getPrices(
    fromDate: string,
    toDate: string,
    location: LocationType,
    type: ProductType
  ): Promise<Price[]> {
    console.log("Fetching Price By Date");
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: "PriceLocationIndex",
      KeyConditionExpression:
        "#Location = :Location and #TS BETWEEN :From AND :To",
      ExpressionAttributeNames: {
        "#Location": "Location",
        "#TS": "TS",
      },
      ExpressionAttributeValues: {
        ":Location": `${location}#${type}`,
        ":From": fromDate,
        ":To": toDate,
      },
    });
    const { Items } = await this.store.dynamoClient.send(command);
    return this.convertResultToModel(Items);
  }
  async getPricesByProductId(
    productId: string,
    duration: DurationType,
    location: LocationType,
    type: ProductType,
    fromDate: string,
    toDate: string
  ): Promise<Price[]> {
    console.log("Fetching Price By Product");
    const productKey =
      !duration || duration == DurationType.daily
        ? `${productId}#${location}#${type}`
        : `${productId}#${location}#${type}#${duration}`;
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "#ProductId = :ProductId and #TS BETWEEN :From AND :To",
      ExpressionAttributeNames: {
        "#ProductId": "ProductId",
        "#TS": "TS",
      },
      ExpressionAttributeValues: {
        ":ProductId": productKey,
        ":From": fromDate,
        ":To": toDate,
      },
    });
    const { Items } = await this.store.dynamoClient.send(command);
    return this.convertResultToModel(Items);
  }
  private convertResultToModel(items?: Record<string, any>[]): Price[] {
    if (!items || items.length === 0) {
      return [];
    }
    return this.mapper.toListModel(
      items.map(
        (i) =>
          <PriceRepositoryDTO>{
            ProductId: i["ProductId"],
            Location: i["Location"],
            TS: i["TS"],
            Price: i["Price"],
            Unit: i["Unit"],
          }
      )
    );
  }
}
