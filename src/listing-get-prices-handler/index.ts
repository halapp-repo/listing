import "reflect-metadata";
import * as moment from "moment-timezone";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import PriceRepository from "../repositories/price.repository";
import { LocationType } from "../models/location-type";
import { ProductType } from "../models/product-type-type";
import { PriceToPriceVMMapper as PriceVMMapper } from "../mappers/price-to-price-vm.mapper";
import { diContainer } from "../core/di-registry";
import createHttpError = require("http-errors");

const lambdaHandler = async function (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> {
  const location = getLocation(event.queryStringParameters?.location);
  const type = getProductType(event.queryStringParameters?.type);
  const [from, to] = getDateInterval(event.queryStringParameters?.date);

  const repo = diContainer.resolve<PriceRepository>("PriceRepository");
  const prices = await repo.getPrices(from, to, location, type);
  return {
    statusCode: 200,
    body: JSON.stringify(new PriceVMMapper().toListDTO(prices)),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

function getDateInterval(date: string | undefined): [string, string] {
  let from: string;
  let to: string;
  if (!date) {
    from = moment.tz("Europe/Istanbul").startOf("day").format();
    to = moment.tz("Europe/Istanbul").endOf("day").format();
  } else {
    from = moment.tz(date, "Europe/Istanbul").startOf("day").format();
    to = moment.tz(date, "Europe/Istanbul").endOf("day").format();
  }
  console.log("From & To Date :", JSON.stringify({ from, to }, null, 2));
  return [from, to];
}
function getLocation(location: string | undefined): LocationType {
  if (!location) {
    throw createHttpError(400, "location must be defined");
  }
  const locationType = LocationType[location as keyof typeof LocationType];
  if (!locationType) {
    throw createHttpError(400, "location type isn't supported");
  }
  console.log("Location :", JSON.stringify({ locationType }, null, 2));
  return locationType;
}
function getProductType(type: string | undefined): ProductType {
  if (!type) {
    throw createHttpError(400, "type must be defined");
  }
  const productType = ProductType[type as keyof typeof ProductType];
  if (!productType) {
    throw createHttpError(400, "product type isn't supported");
  }
  console.log("Product Type :", JSON.stringify({ productType }, null, 2));
  return productType;
}

const handler = middy(lambdaHandler)
  .use(httpResponseSerializer())
  .use(httpErrorHandler())
  .use(cors());

export { handler, lambdaHandler };
