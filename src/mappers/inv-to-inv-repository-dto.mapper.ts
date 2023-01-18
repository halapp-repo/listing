import { InventoryRepositoryDTO } from '../models/dtos/inventory.repository.dto';
import { Inventory } from '../models/inventory';
import { InventoryType } from '../models/inventory-type';
import { ProductType } from '../models/product-type';
import { IMapper } from './base.mapper';

export class InvToInvRepositoryDTOMapper extends IMapper<Inventory, InventoryRepositoryDTO> {
  toDTO(arg: Inventory): InventoryRepositoryDTO {
    const type = arg.Type;
    const productId = arg.ProductId;
    return {
      InventoryType: arg.InventoryType,
      InventoryId: productId ? `${type}#${productId}` : `${type}`,
      Name: arg.Name,
      ImageUrl: arg.ImageUrl
    } as InventoryRepositoryDTO;
  }
  toModel(arg: InventoryRepositoryDTO): Inventory {
    const inventory = arg.InventoryType;
    const [type, productId] = arg.InventoryId.split('#');
    const productType = ProductType[type as keyof typeof ProductType];
    const inventoryType = InventoryType[inventory as keyof typeof InventoryType];
    const name = arg.Name;
    const imageUrl = arg.ImageUrl;
    return {
      Type: productType,
      Name: name,
      ImageUrl: imageUrl,
      InventoryType: inventoryType,
      ProductId: productId
    } as Inventory;
  }
}
