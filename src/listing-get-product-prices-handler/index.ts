import "reflect-metadata";
import * as moment from "moment-timezone";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import * as createError from "http-errors";
import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";
import { LocationType } from "../models/location-type";
import { ProductType } from "../models/product-type-type";
import { DurationType } from "../models/duration-type";
import PriceRepository from "../repositories/price.repository";
import { PriceToPriceRepositoryDTOMapper as RepoMapper } from "../mappers/price-to-price-repository-dto.mapper";
import { RequestValidationError } from "../models/errors/request-validation.error";
import { PriceToProductPriceVMMapper as VMMapper } from "../mappers/price-to-product-price-vm.mapper";
import createHttpError = require("http-errors");
import { diContainer } from "../core/di-registry";

const lambdaHandler = async function (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const productId = getProductId(event.pathParameters?.productId);
  const duration = getDuration(event.queryStringParameters?.duration);
  const location = getLocation(event.queryStringParameters?.location);
  const productType = getProductType(event.queryStringParameters?.type);
  const [from, to] = getDateInterval(
    duration,
    event.queryStringParameters?.from_date
  );

  const repo = diContainer.resolve<PriceRepository>("PriceRepository");
  const prices = await repo.getPricesByProductId(
    productId,
    duration,
    location,
    productType,
    from,
    to
  );
  return {
    statusCode: 200,
    body: JSON.stringify(new VMMapper().toListDTO(prices)),
    headers: {
      "Content-Type": "application/json",
    },
  };
};
function getProductId(productId: string | undefined): string {
  if (!productId) {
    throw createHttpError(400, "ProductId is required");
  }
  return productId;
}
function getDuration(duration: string | undefined): DurationType {
  if (!duration) {
    throw createHttpError(400, "location must be defined");
  }
  const durationType = DurationType[duration as keyof typeof DurationType];
  if (!durationType) {
    throw createHttpError(400, "duration type isn't supported");
  }
  console.log("Duration :", JSON.stringify({ durationType }, null, 2));
  return durationType;
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
function getDateInterval(
  duration: DurationType,
  fromDate: string | undefined
): [string, string] {
  let from: string;
  const to = moment.tz("Europe/Istanbul").endOf("day").format();
  if (fromDate) {
    from = moment.tz(fromDate, "Europe/Istanbul").startOf("day").format();
  } else {
    switch (duration) {
      case DurationType.daily:
        from = moment
          .tz(fromDate, "Europe/Istanbul")
          .subtract(30, "d")
          .format();
        break;
      case DurationType.weekly:
        from = moment
          .tz(fromDate, "Europe/Istanbul")
          .subtract(52, "w")
          .format();
        break;
      case DurationType.monthly:
        from = moment
          .tz(fromDate, "Europe/Istanbul")
          .subtract(12, "m")
          .format();
        break;
      case DurationType.yearly:
        from = moment
          .tz(fromDate, "Europe/Istanbul")
          .subtract(10, "y")
          .format();
        break;
      default:
        throw createHttpError(400, "Unsuported duration");
    }
  }
  console.log("Date interval :", JSON.stringify({ from, to }, null, 2));
  return [from, to];
}

const handler = middy(lambdaHandler)
  .use(httpResponseSerializer())
  .use(httpErrorHandler())
  .use(cors());

export { handler, lambdaHandler };
