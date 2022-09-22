import * as moment from 'moment-timezone'
import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import PricesRepository from '../repositories/prices.repository';
import { LocationType } from '../models/location-type';
import { ProductType } from '../models/product-type-type';
import { PriceToPriceVMMapper as PriceVMMapper } from '../mappers/price-to-price-vm-dto.mapper';
import { PriceToPriceRepositoryDTOMapper as RepoMapper } from '../mappers/price-to-price-repository-dto.mapper'
import { RequestValidationError } from '../models/errors/request-validation.error';

const docClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(docClient)

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    try {
        const location = getLocation(event.queryStringParameters?.location);
        const type = getProductType(event.queryStringParameters?.type);
        const [from, to] = getDateInterval(event.queryStringParameters?.date)

        const repo = new PricesRepository(documentClient, new RepoMapper());
        const prices = await repo.getPrices(from, to, location, type)
        return {
            statusCode: 200,
            body: JSON.stringify(new PriceVMMapper().toListDTO(prices)),
            headers: {
                'Content-Type': 'application/json',
            }
        }
    } catch (err) {
        if (err instanceof RequestValidationError) {
            return {
                statusCode: err.statusCode,
                body: err.message,
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        }
        return {
            statusCode: 500,
            body: "check server logs",
            headers: {
                'Content-Type': 'application/json',
            }
        }
    }
}

function getDateInterval(date: string | undefined): [string, string] {
    let from: string;
    let to: string;
    if (!date) {
        from = moment.tz("Europe/Istanbul").startOf('day').format()
        to = moment.tz("Europe/Istanbul").endOf('day').format()
    } else {
        from = moment.tz(date, "Europe/Istanbul").startOf("day").format()
        to = moment.tz(date, "Europe/Istanbul").endOf('day').format()
    }
    console.log("From & To Date :", JSON.stringify({ from, to }, null, 2));
    return [from, to]
}
function getLocation(location: string | undefined): LocationType {
    if (!location) {
        throw new RequestValidationError("location must be defined")
    }
    const locationType = LocationType[location as keyof typeof LocationType]
    if (!locationType) {
        throw new RequestValidationError("location type isn't supported")
    }
    console.log("Location :", JSON.stringify({ locationType }, null, 2));
    return locationType
}
function getProductType(type: string | undefined): ProductType {
    if (!type) {
        throw new RequestValidationError("type must be defined")
    }
    const productType = ProductType[type as keyof typeof ProductType]
    if (!productType) {
        throw new RequestValidationError("product type isn't supported")
    }
    console.log("Product Type :", JSON.stringify({ productType }, null, 2));
    return productType
}

