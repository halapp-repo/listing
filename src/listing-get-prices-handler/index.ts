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
import { ProductType } from "../models/product-type";
import { PriceToPriceVMMapper as PriceVMMapper } from "../mappers/price-to-price-vm.mapper";
import { diContainer } from "../core/di-registry";
import createHttpError = require("http-errors");
import { PriceService } from "../services/price.service";
import { trMoment } from "../utils/timezone";

const lambdaHandler = async function (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> {
  const location = getLocation(event.queryStringParameters?.location);
  const type = getProductType(event.queryStringParameters?.type);
  const date = getDate(event.queryStringParameters?.date);

  const priceService = diContainer.resolve(PriceService);
  const prices = await priceService.getPrices({
    date: date,
    location: location,
    type: type,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(new PriceVMMapper().toListDTO(prices)),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

function getDate(date?: string): moment.Moment {
  let selectedDate: moment.Moment;
  if (!date) {
    selectedDate = trMoment();
  } else {
    selectedDate = trMoment(date);
  }
  console.log("Selected Date :", selectedDate.format());
  return selectedDate;
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
