import * as ExcelJS from "exceljs";
import { Stream } from "stream";
import { inject, injectable } from "tsyringe";
import { PriceInputDTO } from "../models/dtos/price.input.dto";
import { LocationType } from "../models/location-type";
import { Price } from "../models/price";
import { ProductType } from "../models/product-type-type";
import { BaseFileService } from "./base-file.service";
import { PriceToPriceInputDTOMapper as PrToPrInMapper } from "../mappers/price-to-price-input-dto.mapper";

@injectable()
export class PriceExcelService implements BaseFileService<Price> {
  constructor(
    @inject("PrToPrInMapper")
    private mapper: PrToPrInMapper
  ) {}
  setLocationType(location: LocationType) {
    this.mapper.setLocationType(location);
  }
  setProductType(product: ProductType) {
    this.mapper.setProductType(product);
  }
  setTimeStamp(timeStamp: string) {
    this.mapper.setTimeStamp(timeStamp);
  }
  async read(stream: Stream): Promise<Price[]> {
    console.log("Reading excel file");
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      worksheets: "emit",
      sharedStrings: "cache",
    });
    const priceInput: PriceInputDTO[] = [];
    for await (const worksheetReader of workbookReader) {
      for await (const row of worksheetReader) {
        if (row.number === 1) {
          // skip header
          continue;
        }
        const productId = row.getCell(1).text;
        const productName = row.getCell(2).text;
        const price = row.getCell(3).text;
        const unit = row.getCell(4).text;
        if (price && !isNaN(+price)) {
          priceInput.push({
            ProductId: productId,
            ProductName: productName,
            Price: Number(price),
            Unit: unit,
          });
        }
      }
    }
    return this.mapper.toListModel(priceInput);
  }
}
