import { IMapper } from './base.mapper'
import { Product } from '../models/product'
import { PriceEntryDTO } from '../models/price-entry-dto'

export class ProductToPriceEntryDTOMapper implements IMapper<Product, PriceEntryDTO>{
    toDTO(arg: Product): PriceEntryDTO {
        const productId = arg.ProductId.trim()
        const location = arg.Location.trim()
        const type = arg.Type.trim()
        return {
            ProductId: `${productId}#${location}#${type}`,
            TS: arg.Time,
            Location: `${location}#${type}`,
            Price: arg.Price,
            Unit: arg.Unit
        }
    }
    toModal(arg: PriceEntryDTO): Product {
        const [productId, location, type] = arg.ProductId.split("#")
        return {
            ProductId: productId,
            Location: location,
            Type: type,
            Price: arg.Price,
            Unit: arg.Unit,
            Time: arg.TS
        }
    }
}