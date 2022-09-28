import { PriceViewModel } from "../models/viewmodels/price.viewmodel";
import { Price } from "../models/price";
import { IMapper } from "./base.mapper";

export class PriceToPriceVMMapper extends IMapper<Price, PriceViewModel>{
    toDTO(arg: Price): PriceViewModel {
        return {
            Price: arg.Price,
            ProductId: arg.ProductId,
            TS: arg.TS,
            Unit: arg.Unit
        }
    }
    toModel(arg: PriceViewModel): Price {
        throw new Error("Not Implemented")
    }
    toListModel(arg: PriceViewModel[]): Price[] {
        throw new Error("Not Implemented")
    }
}