import { ProductType } from "./product-type";
import { Price } from "./price";

export class Product {
  ProductId: string;
  ProductType: ProductType;
  Prices: Price[];
  constructor(productId: string, productType: ProductType, prices: Price[]) {
    this.ProductId = productId;
    this.ProductType = productType;
    this.Prices = prices;
  }
}
