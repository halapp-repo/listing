export interface BuildConfig {
  readonly AccountID: string;
  readonly App: string;
  readonly Environment: string;
  readonly Region: string;

  readonly SQSInventoriesUpdatedQueue: 'LISTING_InventoriesUpdatedQueue';
  readonly SQSPricesUpdatedQueue: 'LISTING_PricesUpdatedQueue';
}
