import { Price } from "../models/price"
import { PriceInputDTO } from '../models/dtos/price.input.dto'
import { IMapper } from './base.mapper'

export class PriceToPriceInputDTOMapper extends IMapper<Price, PriceInputDTO> {
    location: string
    type: string
    timestamp: string
    constructor(location: string, type: string, timestamp: string) {
        super()
        this.location = location
        this.type = type
        this.timestamp = timestamp
    }
    toDTO(arg: Price): PriceInputDTO {
        throw new Error("Not Implemented")
    }
    toListDTO(arg: Price[]): PriceInputDTO[] {
        throw new Error("Not Implemented")
    }
    toModel(arg: PriceInputDTO): Price {
        return {
            Location: this.location,
            Price: arg.Price,
            ProductId: arg.ProductId,
            TS: this.timestamp,
            Type: this.type,
            Unit: arg.Unit
        }
    }
}