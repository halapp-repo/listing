import * as ExcelJS from "exceljs";
import { Stream } from "stream";
import { inject, injectable } from "tsyringe";
import { IMapper } from "../mappers/base.mapper";
import { InventoryInputDTO } from "../models/dtos/inventory.input.dto";
import { Inventory } from "../models/inventory";
import { BaseFileService } from "./base-file.service";

@injectable()
export class InventoryExcelService implements BaseFileService<Inventory> {
  constructor(
    @inject("ItToItInMapper")
    private mapper: IMapper<Inventory, InventoryInputDTO>
  ) {}
  async read(stream: Stream): Promise<Inventory[]> {
    console.log("Reading excel file");
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      worksheets: "emit",
      sharedStrings: "cache",
    });
    const itemInput: InventoryInputDTO[] = [];
    for await (const worksheetReader of workbookReader) {
      for await (const row of worksheetReader) {
        if (row.number === 1) {
          // skip header
          continue;
        }
        const categoryId = row.getCell(1).text;
        const itemName = row.getCell(2).text;
        const name = row.getCell(3).text;
        const imageUrl = row.getCell(4).text;
        if (categoryId && itemName) {
          itemInput.push({
            InventoryType: categoryId,
            InventoryId: itemName,
            Name: name,
            ImageUrl: imageUrl,
          });
        }
      }
    }
    return itemInput.map((p) => this.mapper.toModel(p));
  }
}
