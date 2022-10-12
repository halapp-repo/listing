import "reflect-metadata";
import { plainToClass } from "class-transformer";
import { Price } from "../../../src/models/price";
import { LocationType } from "../../../src/models/location-type";
import { PriceRepositoryDTO } from "../../../src/models/dtos/price.repository.dto";
import { PriceToPriceRepositoryDTOMapper } from "../../../src/mappers/price-to-price-repository-dto.mapper";
import { diContainer } from "../../../src/core/di-registry";
import { PriceService } from "../../../src/services/price.service";
import { ProductType } from "../../../src/models/product-type";
import { trMoment } from "../../../build/src/utils/timezone";

describe("PriceService", () => {
  test("Group By Product Id", async () => {
    const mapper = new PriceToPriceRepositoryDTOMapper();
    const service = diContainer.resolve(PriceService);
    const pricesDTO: PriceRepositoryDTO[] = [
      {
        Location: LocationType.istanbul,
        Price: 12,
        ProductId: `A#${LocationType.istanbul}#${ProductType.produce}`,
        TS: trMoment().format(),
        Unit: "KG",
      },
      {
        Location: LocationType.istanbul,
        Price: 12,
        ProductId: `A#${LocationType.istanbul}#${ProductType.produce}`,
        TS: trMoment().format(),
        Unit: "KG",
      },
      {
        Location: LocationType.istanbul,
        Price: 12,
        ProductId: `B#${LocationType.istanbul}#${ProductType.produce}`,
        TS: trMoment().format(),
        Unit: "KG",
      },
    ];
    const prices = mapper.toListModel(pricesDTO);
    const result = service.groupByProduct(prices);
    expect(Object.values(result).length).toBe(2);
  });
});
