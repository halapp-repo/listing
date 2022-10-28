import { plainToClass } from "class-transformer";
import { PriceRepositoryDTO } from "../models/dtos/price.repository.dto";
import { LocationType } from "../models/location-type";
import { Price } from "../models/price";
import { PriceStatusType } from "../models/price-status-type";
import { ProductType } from "../models/product-type";
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
      TS: arg.TS.format(),
      Location: `${location}#${type}`,
      Price: arg.Price,
      Unit: arg.Unit,
      ...(arg.Active
        ? {
            Active: `${PriceStatusType.active}#${location}#${type}`,
          }
        : null),
    };
  }
  toModel(arg: PriceRepositoryDTO): Price {
    const [productId, location, type, duration] = arg.ProductId.split("#");
    const locationType = LocationType[location as keyof typeof LocationType];
    const productType = ProductType[type as keyof typeof ProductType];
    const [active] = arg.Active?.split("#") || [""];
    if (!locationType || !productType) {
      throw new Error("undefined locationType & productType");
    }
    return plainToClass(Price, {
      ProductId: productId,
      Location: locationType,
      Type: productType,
      Price: arg.Price,
      Unit: arg.Unit,
      TS: arg.TS,
      Duration: duration,
      Active: active === PriceStatusType.active,
    });
  }
}
