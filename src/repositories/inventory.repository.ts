import { inject, injectable } from "tsyringe";
import {
  BatchWriteCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { IMapper } from "../mappers/base.mapper";
import { InventoryRepositoryDTO } from "../models/dtos/inventory.repository.dto";
import { Inventory } from "../models/inventory";
import { chuckArray } from "../utils/array.utils";
import { DynamoStore } from "./dynamo-store";

@injectable()
export default class InventoryRepository {
  private tableName = "HalInventory";
  private chunkSize = 25;

  constructor(
    @inject("DBStore")
    private store: DynamoStore,
    @inject("InvToInvRepoMapper")
    private mapper: IMapper<Inventory, InventoryRepositoryDTO>
  ) {}

  async getAllItems(): Promise<Inventory[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
    });
    const { Items } = await this.store.dynamoClient.send(command);
    return this.convertResultToModel(Items);
  }
  async createItems(items: Inventory[]): Promise<void> {
    if (!items) {
      return;
    }
    const itemDtoList = this.mapper.toListDTO(items);
    for (const chunk of chuckArray(itemDtoList, this.chunkSize)) {
      const itemEntries = chunk.map((entry) =>
        Object.assign({ PutRequest: { Item: entry } })
      );
      console.log(
        `Item Entries :`,
        JSON.stringify({ itemEntries: itemEntries }, null, 2)
      );
      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: itemEntries,
        },
      });
      await this.store.dynamoClient.send(command);
    }
  }
  async deleteItems(items: Inventory[]): Promise<void> {
    if (!items) {
      return;
    }
    const itemDtoList = this.mapper.toListDTO(items);
    for (const deletingItem of itemDtoList) {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: {
          InventoryType: deletingItem.InventoryType,
          InventoryId: deletingItem.InventoryId,
        },
      });
      await this.store.dynamoClient.send(command);
    }
  }
  private convertResultToModel(items?: Record<string, any>[]): Inventory[] {
    if (!items || items.length === 0) {
      return [];
    }
    return this.mapper.toListModel(
      items.map(
        (i) =>
          <InventoryRepositoryDTO>{
            InventoryType: i["InventoryType"],
            InventoryId: i["InventoryId"],
            Name: i["Name"],
            ImageUrl: i["ImageUrl"],
          }
      )
    );
  }
}
