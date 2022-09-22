import * as fs from 'fs';
import * as path from 'path'
import { PriceExcelService } from '../../../src/services/price-excel.service'
import { PriceToPriceInputDTOMapper } from '../../../src/mappers/price-to-price-input-dto.mapper'

describe("PriceExcelService", () => {
    test("Return Correct Number Of Products", async () => {
        const readable = fs.createReadStream(path.join(__dirname, '../../assests/produce.xlsx'));
        const mapper = new PriceToPriceInputDTOMapper("xx", "yy", "zz")
        const service = new PriceExcelService(mapper)
        const recordList = await service.read(readable)
        expect(recordList.length).toEqual(7)
    })
})