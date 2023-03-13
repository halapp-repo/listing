import { plainToClass } from 'class-transformer';
import { PriceRepositoryDTO } from '../models/dtos/price.repository.dto';
import { CityType, ProductType } from '@halapp/common';
import { Price } from '../models/price';
import { PriceStatusType } from '../models/price-status-type';
import { IMapper } from './base.mapper';

export class PriceToPriceRepositoryDTOMapper extends IMapper<Price, PriceRepositoryDTO> {
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
            Active: `${PriceStatusType.active}#${location}#${type}`
          }
        : null)
    };
  }
  toModel(arg: PriceRepositoryDTO): Price {
    const [productId, location, type, duration] = arg.ProductId.split('#');
    const cityType = CityType[location as keyof typeof CityType];
    const productType = ProductType[type as keyof typeof ProductType];
    const [active] = arg.Active?.split('#') || [''];
    if (!cityType || !productType) {
      throw new Error('undefined cityType & productType');
    }
    return plainToClass(Price, {
      ProductId: productId,
      Location: cityType,
      Type: productType,
      Price: arg.Price,
      Unit: arg.Unit,
      TS: arg.TS,
      Duration: duration,
      Active: active === PriceStatusType.active
    });
  }
}
