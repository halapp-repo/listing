import { PriceVM } from '@halapp/common';
import { Price } from '../models/price';
import { IMapper } from './base.mapper';
import { trMoment } from '../utils/timezone';

export class PriceToPriceVMMapper extends IMapper<Price, PriceVM> {
  toDTO(arg: Price): PriceVM {
    const isToday = arg.isSelectedDatePrice(trMoment());
    return {
      Price: arg.Price,
      ProductId: arg.ProductId,
      TS: arg.TS.format(),
      Unit: arg.Unit,
      Increase: isToday ? arg.Increase : undefined,
      IsToday: isToday ? true : undefined,
      IsActive: arg.Active ? true : undefined
    } as PriceVM;
  }
  toModel(arg: PriceVM): Price {
    throw new Error('Not Implemented');
  }
  toListModel(arg: PriceVM[]): Price[] {
    throw new Error('Not Implemented');
  }
}
