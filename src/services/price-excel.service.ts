import * as ExcelJS from 'exceljs'
import { Stream } from "stream";
import { IMapper } from '../mappers/base.mapper';
import { PriceInputDTO } from "../models/dtos/price.input.dto";
import { Price } from '../models/price';
import { BaseFileService } from "./base-file.service";


export class PriceExcelService implements BaseFileService<Price>{
    mapper: IMapper<Price, PriceInputDTO>
    constructor(mapper: IMapper<Price, PriceInputDTO>) {
        this.mapper = mapper
    }
    async read(stream: Stream): Promise<Price[]> {
        console.log("Reading excel file")
        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
            worksheets: 'emit',
            sharedStrings: "cache"
        });
        const priceInput: PriceInputDTO[] = []
        for await (const worksheetReader of workbookReader) {
            for await (const row of worksheetReader) {
                if (row.number === 1) {
                    // skip header
                    continue;
                }
                const productId = row.getCell(1).text;
                const productName = row.getCell(2).text;
                const price = row.getCell(3).text;
                const unit = row.getCell(4).text
                if (price && !isNaN(+price)) {
                    priceInput.push({
                        ProductId: productId,
                        ProductName: productName,
                        Price: Number(price),
                        Unit: unit,
                    })
                }
            }
        }
        return priceInput.map(p => this.mapper.toModel(p))
    }
}