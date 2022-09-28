import { Price } from "../models/price";
import { PriceInputDTO } from "../models/dtos/price.input.dto";
import { IMapper } from "./base.mapper";
import { Inventory } from "../models/inventory";
import { InventoryInputDTO } from "../models/dtos/inventory.input.dto";
import { ProductType } from "../models/product-type-type";
import { InventoryType } from "../models/inventory-type";

export class InvToInvInputDTOMapper extends IMapper<
  Inventory,
  InventoryInputDTO
> {
  toDTO(arg: Inventory): InventoryInputDTO {
    throw new Error("Not Implemented");
  }
  toListDTO(arg: Inventory[]): InventoryInputDTO[] {
    throw new Error("Not Implemented");
  }
  toModel(arg: InventoryInputDTO): Inventory {
    const [type, productId] = arg.InventoryId.split("#");
    const productType = ProductType[type as keyof typeof ProductType];
    const invetoryType =
      InventoryType[arg.InventoryType as keyof typeof InventoryType];
    return {
      InventoryType: invetoryType,
      Name: arg.Name,
      Type: productType,
      ImageUrl: arg.ImageUrl,
      ProductId: productId,
    };
  }
}
