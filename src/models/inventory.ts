import { InventoryType } from "./inventory-type";
import { ProductType } from "./product-type";

export class Inventory {
  InventoryType: InventoryType;
  Type: ProductType;
  ProductId?: string;
  Name: string;
  ImageUrl?: string;
}
