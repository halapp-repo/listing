import { chuckArray } from "../../../src/utils/array.utils"

describe("ArrayUtil", () => {
    test("Return Correct Number Of Chunk", () => {
        const array = new Array(76)
        const chunks = chuckArray(array, 25)
        expect(chunks.length).toEqual(4)
    })
})