import { Price } from "../models/price";
import { PriceInputDTO } from "../models/dtos/price.input.dto";
import { IMapper } from "./base.mapper";
import { LocationType } from "../models/location-type";
import { ProductType } from "../models/product-type-type";

export class PriceToPriceInputDTOMapper extends IMapper<Price, PriceInputDTO> {
  private location: LocationType;
  private type: ProductType;
  private timestamp: string;
  setLocationType(location: LocationType) {
    this.location = location;
  }
  setProductType(type: ProductType) {
    this.type = type;
  }
  setTimeStamp(timeStamp: string) {
    this.timestamp = timeStamp;
  }
  toDTO(arg: Price): PriceInputDTO {
    throw new Error("Not Implemented");
  }
  toListDTO(arg: Price[]): PriceInputDTO[] {
    throw new Error("Not Implemented");
  }
  toModel(arg: PriceInputDTO): Price {
    if (!this.location || !this.type || !this.timestamp) {
      throw new Error("Mapper is not set");
    }
    return {
      Location: this.location,
      Price: arg.Price,
      ProductId: arg.ProductId,
      TS: this.timestamp,
      Type: this.type,
      Unit: arg.Unit,
    };
  }
}
