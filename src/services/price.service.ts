import { inject, injectable } from 'tsyringe';
import * as moment from 'moment';
import { CityType, ProductType } from '@halapp/common';
import { Price } from '../models/price';
import PriceRepository from '../repositories/price.repository';
import { trMoment } from '../utils/timezone';
import { getComparator } from '../utils/sort';

interface PriceGroup {
  [key: string]: Price[];
}

@injectable()
export class PriceService {
  constructor(
    @inject('PriceRepository')
    private repo: PriceRepository
  ) {}
  async getPrices({
    date,
    location,
    type
  }: {
    date: moment.Moment;
    location: CityType;
    type: ProductType;
  }): Promise<Price[]> {
    const today = trMoment();
    const isToday: boolean = date.isSameOrAfter(today, 'day');

    if (!isToday) {
      const prices = await this.repo.getPrices({
        fromDate: date.clone().startOf('day').format(),
        toDate: date.clone().endOf('day').format(),
        location: location,
        type: type
      });
      console.log(`${prices.length} # of prices found `);
      return this.getNewestPrices(prices);
    }
    const activePrices = await this.repo.getActivePrices({
      location: location,
      type: type
    });
    const yesterdayPrices = await this.repo.getPrices({
      fromDate: date.clone().subtract(1, 'd').startOf('day').format(),
      toDate: date.clone().subtract(1, 'd').endOf('day').format(),
      location: location,
      type: type
    });

    // Set Increase Percentage
    const yesterdayNewestPrice = this.getNewestPrices(yesterdayPrices);
    activePrices.forEach((p) => {
      const yp: number =
        yesterdayNewestPrice.filter((yp) => yp.ProductId == p.ProductId)[0]?.Price || 0;
      p.setIncrease(yp);
    });
    // Get Newest Price
    return activePrices;
  }
  public getNewestPrices(prices: Price[]): Price[] {
    return Object.values(this.groupByProduct(prices))
      .map((pricesByProductId: Price[]) => {
        return pricesByProductId.sort(getComparator('desc', 'TS'))[0];
      })
      .filter((p) => p.Price > 0);
  }
  public groupByProduct(prices: Price[]): PriceGroup {
    return prices.reduce((group: PriceGroup, price: Price) => {
      //Group Prices by ProductId
      const { ProductId } = price;
      if (group[ProductId]) {
        group[ProductId].push(price);
      } else {
        group[ProductId] = [price];
      }
      return group;
    }, {});
  }
}
