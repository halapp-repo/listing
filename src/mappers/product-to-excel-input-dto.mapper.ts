import { IMapper } from './base.mapper'
import { Product } from '../models/product'
import { PriceEntryDTO } from '../models/price-entry-dto'
import { ExcelInputDTO } from '../models/excel-input-dto'

export class ProductToExcelInputDTOMapper implements IMapper<Product, ExcelInputDTO>{
    location: string
    type: string
    timezone: string
    constructor(location: string, type: string, timezone: string) {
        this.location = location
        this.type = type
        this.timezone = timezone
    }
    toDTO(arg: Product): ExcelInputDTO {
        throw new Error("Not Implemented")
    }
    toModal(arg: ExcelInputDTO): Product {
        return {
            Location: this.location,
            Price: arg.Price,
            ProductId: arg.ProductId,
            Time: this.timezone,
            Type: this.type,
            Unit: arg.Unit
        }
    }
}