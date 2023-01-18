import { IMapper } from './base.mapper';
import { Inventory } from '../models/inventory';
import { InventoryVM } from '@halapp/common';

export class InvToInvVMMapper extends IMapper<Inventory, InventoryVM> {
  toDTO(arg: Inventory): InventoryVM {
    return {
      Name: arg.Name,
      Type: arg.Type,
      ImageUrl: arg.ImageUrl,
      ProductId: arg.ProductId,
      InventoryType: arg.InventoryType
    } as InventoryVM;
  }
  toModel(arg: InventoryVM): Inventory {
    throw new Error('Not Implemented');
  }
  toListModel(arg: InventoryVM[]): Inventory[] {
    throw new Error('Not Implemented');
  }
}
