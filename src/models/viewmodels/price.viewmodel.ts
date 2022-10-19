export interface PriceViewModel {
  ProductId: string;
  TS: string;
  Price: number;
  Unit: string;
  IsToday?: boolean;
  Increase?: number;
  IsActive?: boolean;
}
