import moment = require('moment');
import { trMoment } from '../utils/timezone';
import { CityType, ProductType } from '@halapp/common';
import { Type, Transform } from 'class-transformer';

export class Price {
  ProductId: string;

  @Type(() => String)
  @Transform(({ value }: { value: string }) => trMoment(value), {
    toClassOnly: true
  })
  TS: moment.Moment;

  Price: number;
  Location: CityType;
  Unit: string;
  Type: ProductType;
  Duration?: string;
  Increase?: number;
  Active?: boolean;

  isSelectedDatePrice(selectedDate: moment.Moment): boolean {
    return this.TS.isBetween(
      selectedDate.clone().startOf('day'),
      selectedDate.clone().endOf('day')
    );
  }
  setIncrease(previousPrice: number) {
    if (!previousPrice) {
      this.Increase = 0;
    }
    this.Increase = Math.round(((this.Price - previousPrice) / previousPrice) * 100);
  }
  setActive(status: boolean) {
    this.Active = status;
  }
}
