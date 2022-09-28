import { LocationType } from "./location-type";
import { ProductType } from "./product-type-type";

export class Price {
  ProductId: string;
  TS: string;
  Price: number;
  Location: LocationType;
  Unit: string;
  Type: ProductType;
  Duration?: string;
}
