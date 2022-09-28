import { IMapper } from "./base.mapper";
import { Inventory } from "../models/inventory";
import { InventoryViewModel } from "../models/viewmodels/inventory.viewmodel";

export class InvToInvVMMapper extends IMapper<Inventory, InventoryViewModel> {
  toDTO(arg: Inventory): InventoryViewModel {
    return {
      Name: arg.Name,
      Type: arg.Type,
      ImageUrl: arg.ImageUrl,
      ProductId: arg.ProductId,
      InventoryType: arg.InventoryType,
    };
  }
  toModel(arg: InventoryViewModel): Inventory {
    throw new Error("Not Implemented");
  }
  toListModel(arg: InventoryViewModel[]): Inventory[] {
    throw new Error("Not Implemented");
  }
}
