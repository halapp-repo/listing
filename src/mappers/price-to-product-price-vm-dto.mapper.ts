import { ProductPriceViewModel } from "../models/viewmodels/product-price.viewmodel"
import { Price } from "../models/price"
import { IMapper } from "./base.mapper"

export class PriceToProductPriceVMMapper extends IMapper<Price, ProductPriceViewModel>{
    toDTO(arg: Price): ProductPriceViewModel {
        return {
            Price: arg.Price,
            TS: arg.TS,
            Unit: arg.Unit,
            Duration: arg.Duration
        }
    }
    toModel(arg: ProductPriceViewModel): Price {
        throw new Error("Not Implemented")
    }
    toListModel(arg: ProductPriceViewModel[]): Price[] {
        throw new Error("Not Implemented")
    }
}