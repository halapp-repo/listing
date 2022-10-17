import { PriceViewModel } from "../models/viewmodels/price.viewmodel";
import { Price } from "../models/price";
import { IMapper } from "./base.mapper";
import { trMoment } from "../utils/timezone";

export class PriceToPriceVMMapper extends IMapper<Price, PriceViewModel> {
  toDTO(arg: Price): PriceViewModel {
    const isToday = arg.isSelectedDatePrice(trMoment());
    return {
      Price: arg.Price,
      ProductId: arg.ProductId,
      TS: arg.TS.format(),
      Unit: arg.Unit,
      Increase: isToday ? arg.Increase : undefined,
      IsToday: isToday ? true : undefined,
    };
  }
  toModel(arg: PriceViewModel): Price {
    throw new Error("Not Implemented");
  }
  toListModel(arg: PriceViewModel[]): Price[] {
    throw new Error("Not Implemented");
  }
}
