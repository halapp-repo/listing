import { PriceViewModel } from "../models/viewmodels/price.viewmodel";
import { Price } from "../models/price";
import { IMapper } from "./base.mapper";
import { trMoment } from "../utils/timezone";

export class PriceToPriceVMMapper extends IMapper<Price, PriceViewModel> {
  toDTO(arg: Price): PriceViewModel {
    const today = trMoment();
    return {
      Price: arg.Price,
      ProductId: arg.ProductId,
      TS: arg.TS.format(),
      Unit: arg.Unit,
      Increase: arg.isSelectedDatePrice(today) ? arg.Increase : undefined,
      IsToday: arg.isSelectedDatePrice(today),
    };
  }
  toModel(arg: PriceViewModel): Price {
    throw new Error("Not Implemented");
  }
  toListModel(arg: PriceViewModel[]): Price[] {
    throw new Error("Not Implemented");
  }
}
