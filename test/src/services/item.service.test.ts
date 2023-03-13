import 'reflect-metadata';
import { Inventory } from '../../../src/models/inventory';
import { ProductType } from '@halapp/common';
import { InventoryService } from '../../../src/services/inventory.service';
import { diContainer } from '../../../src/core/di-registry';
import { InventoryType } from '../../../src/models/inventory-type';

describe('ItemService', () => {
  test('Return Correct Items', async () => {
    const service = diContainer.resolve(InventoryService);
    const itemsFrom: Inventory[] = [
      {
        InventoryType: InventoryType.category,
        Name: 'N',
        Type: ProductType.produce
      }
    ];
    const itemsTo: Inventory[] = [];
    const [c, u, d] = service.getItemDifferences(itemsFrom, itemsTo);
    expect(c.length).toBe(1);
    expect(u.length).toBe(0);
    expect(d.length).toBe(0);
  });
  test('Return Correct Items 2', async () => {
    const service = diContainer.resolve(InventoryService);
    const itemsFrom: Inventory[] = [
      {
        InventoryType: InventoryType.category,
        Name: 'N',
        Type: ProductType.produce
      }
    ];
    const itemsTo: Inventory[] = [
      {
        InventoryType: InventoryType.category,
        Name: 'N1',
        Type: ProductType.produce
      }
    ];
    const [c, u, d] = service.getItemDifferences(itemsFrom, itemsTo);
    expect(c.length).toBe(0);
    expect(u.length).toBe(1);
    expect(d.length).toBe(0);
  });
  test('Return Correct Items 3', async () => {
    const service = diContainer.resolve(InventoryService);
    const itemsFrom: Inventory[] = [];
    const itemsTo: Inventory[] = [
      {
        InventoryType: InventoryType.category,
        Name: 'N1',
        Type: ProductType.produce
      }
    ];
    const [c, u, d] = service.getItemDifferences(itemsFrom, itemsTo);
    expect(c.length).toBe(0);
    expect(u.length).toBe(0);
    expect(d.length).toBe(1);
  });
  test('Return Correct Items 4', async () => {
    const service = diContainer.resolve(InventoryService);
    const itemsFrom: Inventory[] = [
      {
        InventoryType: InventoryType.category,
        Name: 'N1',
        Type: ProductType.produce
      }
    ];
    const itemsTo: Inventory[] = [
      {
        InventoryType: InventoryType.category,
        Name: 'N1',
        Type: ProductType.produce
      }
    ];
    const [c, u, d] = service.getItemDifferences(itemsFrom, itemsTo);
    expect(c.length).toBe(0);
    expect(u.length).toBe(0);
    expect(d.length).toBe(0);
  });
});
