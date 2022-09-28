import { PriceRepositoryDTO } from "../models/dtos/price.repository.dto";
import { LocationType } from "../models/location-type";
import { Price } from "../models/price";
import { ProductType } from "../models/product-type-type";
import { IMapper } from "./base.mapper";

export class PriceToPriceRepositoryDTOMapper extends IMapper<
  Price,
  PriceRepositoryDTO
> {
  toDTO(arg: Price): PriceRepositoryDTO {
    const productId = arg.ProductId.trim();
    const location = arg.Location;
    const type = arg.Type;
    const duration = arg.Duration?.trim();
    return <PriceRepositoryDTO>{
      ProductId: duration
        ? `${productId}#${location}#${type}#${duration}`
        : `${productId}#${location}#${type}`,
      TS: arg.TS,
      Location: `${location}#${type}`,
      Price: arg.Price,
      Unit: arg.Unit,
    };
  }
  toModel(arg: PriceRepositoryDTO): Price {
    const [productId, location, type, duration] = arg.ProductId.split("#");
    const locationType = LocationType[location as keyof typeof LocationType];
    const productType = ProductType[type as keyof typeof ProductType];
    if (!locationType || !productType) {
      throw new Error("undefined locationType & productType");
    }
    return {
      ProductId: productId,
      Location: locationType,
      Type: productType,
      Price: arg.Price,
      Unit: arg.Unit,
      TS: arg.TS,
      Duration: duration,
    } as Price;
  }
}
