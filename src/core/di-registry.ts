import { container } from 'tsyringe';
import { DynamoStore } from '../repositories/dynamo-store';
import { InvToInvRepositoryDTOMapper as InvToInvRepoMapper } from '../mappers/inv-to-inv-repository-dto.mapper';
import InventoryRepository from '../repositories/inventory.repository';
import { PriceToPriceRepositoryDTOMapper as PrToPrRepoMapper } from '../mappers/price-to-price-repository-dto.mapper';
import PriceRepository from '../repositories/price.repository';
import { InvToInvInputDTOMapper as ItToItInMapper } from '../mappers/inv-to-inv-input-dto.mapper';
import { S3Store } from '../repositories/s3-store';
import { PriceToPriceInputDTOMapper as PrToPrInMapper } from '../mappers/price-to-price-input-dto.mapper';
import { PriceToPriceVMMapper as PrToPrVMMapper } from '../mappers/price-to-price-vm.mapper';

container.registerSingleton<DynamoStore>('DBStore', DynamoStore);
container.registerSingleton<S3Store>('S3Store', S3Store);
container.register('InvToInvRepoMapper', {
  useClass: InvToInvRepoMapper
});
container.register('PrToPrRepoMapper', {
  useClass: PrToPrRepoMapper
});
container.register('InventoryRepository', {
  useClass: InventoryRepository
});
container.register('PriceRepository', {
  useClass: PriceRepository
});
container.register('ItToItInMapper', {
  useClass: ItToItInMapper
});
container.register('PrToPrInMapper', {
  useClass: PrToPrInMapper
});
container.register('PrToPrVMMapper', {
  useClass: PrToPrVMMapper
});

export const diContainer = container;
