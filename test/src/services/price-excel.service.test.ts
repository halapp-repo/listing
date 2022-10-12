import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { PriceExcelService } from "../../../src/services/price-excel.service";
import { PriceToPriceInputDTOMapper } from "../../../src/mappers/price-to-price-input-dto.mapper";
import { diContainer } from "../../../src/core/di-registry";
import { ProductType } from "../../../src/models/product-type";
import { LocationType } from "../../../src/models/location-type";

describe("PriceExcelService", () => {
  test("Return Correct Number Of Products", async () => {
    const service = diContainer.resolve(PriceExcelService);
    service.setLocationType(LocationType.istanbul);
    service.setProductType(ProductType.produce);
    service.setTimeStamp("zz");
    const readable = fs.createReadStream(
      path.join(__dirname, "../../assests/produce.xlsx")
    );
    const recordList = await service.read(readable);
    expect(recordList.length).toEqual(7);
  });
});
