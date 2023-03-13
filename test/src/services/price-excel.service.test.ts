import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { PriceExcelService } from '../../../src/services/price-excel.service';
import { diContainer } from '../../../src/core/di-registry';
import { CityType, ProductType } from '@halapp/common';

describe('PriceExcelService', () => {
  test('Return Correct Number Of Products', async () => {
    const service = diContainer.resolve(PriceExcelService);
    service.setCityType(CityType.istanbul);
    service.setProductType(ProductType.produce);
    service.setTimeStamp('zz');
    const readable = fs.createReadStream(path.join(__dirname, '../../assests/produce.xlsx'));
    const recordList = await service.read(readable);
    expect(recordList.length).toEqual(7);
  });
});
