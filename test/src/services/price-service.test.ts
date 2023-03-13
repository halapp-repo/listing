import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { Price } from '../../../src/models/price';
import { CityType, ProductType } from '@halapp/common';
import { PriceRepositoryDTO } from '../../../src/models/dtos/price.repository.dto';
import { PriceToPriceRepositoryDTOMapper } from '../../../src/mappers/price-to-price-repository-dto.mapper';
import { diContainer } from '../../../src/core/di-registry';
import { PriceService } from '../../../src/services/price.service';
import { trMoment } from '../../../build/src/utils/timezone';

describe('PriceService', () => {
  test('Group By Product Id', async () => {
    const mapper = new PriceToPriceRepositoryDTOMapper();
    const service = diContainer.resolve(PriceService);
    const pricesDTO: PriceRepositoryDTO[] = [
      {
        Location: CityType.istanbul,
        Price: 12,
        ProductId: `A#${CityType.istanbul}#${ProductType.produce}`,
        TS: trMoment().format(),
        Unit: 'KG'
      },
      {
        Location: CityType.istanbul,
        Price: 12,
        ProductId: `A#${CityType.istanbul}#${ProductType.produce}`,
        TS: trMoment().format(),
        Unit: 'KG'
      },
      {
        Location: CityType.istanbul,
        Price: 12,
        ProductId: `B#${CityType.istanbul}#${ProductType.produce}`,
        TS: trMoment().format(),
        Unit: 'KG'
      }
    ];
    const prices = mapper.toListModel(pricesDTO);
    const result = service.groupByProduct(prices);
    expect(Object.values(result).length).toBe(2);
  });
});
