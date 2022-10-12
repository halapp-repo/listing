import { inject, injectable } from "tsyringe";
import * as moment from "moment";
import { LocationType } from "../models/location-type";
import { Price } from "../models/price";
import { ProductType } from "../models/product-type";
import PriceRepository from "../repositories/price.repository";
import { trMoment } from "../utils/timezone";
import { getComparator } from "../utils/sort";

interface PriceGroup {
  [key: string]: Price[];
}

@injectable()
export class PriceService {
  constructor(
    @inject("PriceRepository")
    private repo: PriceRepository
  ) {}
  async getPrices({
    date,
    location,
    type,
  }: {
    date: moment.Moment;
    location: LocationType;
    type: ProductType;
  }): Promise<Price[]> {
    const today = trMoment();
    const yesterday = trMoment().subtract(1, "d");
    const isToday: boolean = date.isSameOrAfter(today, "day");
    const prices = await this.repo.getPrices({
      fromDate: isToday
        ? date.clone().subtract(1, "day").startOf("day").format()
        : date.clone().startOf("day").format(),
      toDate: date.clone().endOf("day").format(),
      location: location,
      type: type,
    });
    console.log(`${prices.length} # of prices found `);
    if (!isToday) {
      return prices;
    }
    // Set Increase
    const todaysPrices = prices
      .filter((p) => p.isSelectedDatePrice(today))
      .filter((p) => p.Price > 0);
    const yesterdayPrices = [...prices].filter((p) =>
      p.isSelectedDatePrice(yesterday)
    );
    todaysPrices.forEach((p) => {
      const yesterdayNewestPrice: number =
        yesterdayPrices
          .filter((yp) => yp.ProductId == p.ProductId)
          .sort(getComparator("desc", "TS"))?.[0].Price || 0;
      p.setIncrease(yesterdayNewestPrice);
    });
    return todaysPrices;

    // // Set Price Increase
    // Object.values(this.groupByProduct(prices)).forEach(
    //   (pricesByProductId: Price[]) => {
    //     const todaysPrices = prices.filter((p) => p.isSelectedDatePrice(today));
    //     const yesterdayPrices = prices.filter((p) =>
    //       p.isSelectedDatePrice(yesterday)
    //     );
    //     const yesterdayNewestPrice =
    //       [...yesterdayPrices].sort(getComparator("desc", "TS"))?.[0].Price ||
    //       0;
    //     todaysPrices.forEach((p) => p.setIncrease(yesterdayNewestPrice));
    //   }
    // );
    // const todaysPrices = prices.filter((p) => p.isSelectedDatePrice(today));
    // console.log(`${todaysPrices.length} of todays prices are returning`);
    // return todaysPrices;
  }
  // public groupByProduct(prices: Price[]): PriceGroup {
  //   return prices.reduce((group: PriceGroup, price: Price) => {
  //     //Group Prices by ProductId
  //     const { ProductId } = price;
  //     if (group[ProductId]) {
  //       group[ProductId].push(price);
  //     } else {
  //       group[ProductId] = [price];
  //     }
  //     return group;
  //   }, {});
  // }
}
