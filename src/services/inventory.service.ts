import { Inventory } from "../models/inventory";
import { isEqual } from "lodash";
import InventoryRepository from "../repositories/inventory.repository";
import { inject, injectable } from "tsyringe";

@injectable()
export class InventoryService {
  constructor(
    @inject("InventoryRepository") private itemRepo: InventoryRepository
  ) {}
  async updateDB(items: Inventory[]) {
    const itemsFromDB = await this.itemRepo.getAllItems();
    const [creating, updating, deleting] = this.getItemDifferences(
      items,
      itemsFromDB
    );
    await this.itemRepo.createItems([...creating, ...updating]);
    await this.itemRepo.deleteItems(deleting);
  }
  getItemDifferences(
    itemsFrom: Inventory[],
    itemsTo: Inventory[]
  ): [Inventory[], Inventory[], Inventory[]] {
    // get all insert
    const creatingItems = itemsFrom.filter(
      (i) =>
        itemsTo.findIndex(
          (idB) =>
            idB.InventoryType == i.InventoryType && idB.ProductId == i.ProductId
        ) == -1
    );
    // get all update
    const updatingItems = itemsFrom.filter((i) => {
      const foundItem = itemsTo.find(
        (idB) =>
          idB.InventoryType == i.InventoryType && idB.ProductId == i.ProductId
      );
      if (!foundItem) {
        return false;
      }
      return !isEqual(i, foundItem);
    });
    // get all delete
    const deletingItems = itemsTo.filter(
      (i) =>
        itemsFrom.findIndex(
          (idB) =>
            idB.InventoryType == i.InventoryType && idB.ProductId == i.ProductId
        ) == -1
    );
    return [creatingItems, updatingItems, deletingItems];
  }
}
