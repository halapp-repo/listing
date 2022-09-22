export class RequestValidationError extends Error {
    statusCode = 400
    constructor(messsage: string) {
        super(messsage)
    }
}