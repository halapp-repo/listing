import { PriceRepositoryDTO } from "../models/dtos/price.repository.dto";
import { Price } from "../models/price";
import { IMapper } from "./base.mapper";

export class PriceToPriceRepositoryDTOMapper extends IMapper<Price, PriceRepositoryDTO>{
    toDTO(arg: Price): PriceRepositoryDTO {
        const productId = arg.ProductId.trim()
        const location = arg.Location.trim()
        const type = arg.Type.trim()
        const duration = arg.Duration?.trim()
        return <PriceRepositoryDTO>{
            ProductId: duration ? `${productId}#${location}#${type}#${duration}` : `${productId}#${location}#${type}`,
            TS: arg.TS,
            Location: `${location}#${type}`,
            Price: arg.Price,
            Unit: arg.Unit
        }
    }
    toModel(arg: PriceRepositoryDTO): Price {
        const [productId, location, type, duration] = arg.ProductId.split("#")
        return <Price>{
            ProductId: productId,
            Location: location,
            Type: type,
            Price: arg.Price,
            Unit: arg.Unit,
            TS: arg.TS,
            Duration: duration
        }
    }
}