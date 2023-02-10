import 'reflect-metadata';
import 'source-map-support/register';
import * as moment from 'moment-timezone';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import httpResponseSerializer from '@middy/http-response-serializer';
import { Context, APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda';
import { ProductType, CityType } from '@halapp/common';
import { PriceToPriceVMMapper as PriceVMMapper } from '../mappers/price-to-price-vm.mapper';
import { diContainer } from '../core/di-registry';
import createHttpError = require('http-errors');
import { PriceService } from '../services/price.service';
import { trMoment } from '../utils/timezone';

const lambdaHandler = async function (
  event: APIGatewayProxyEventV2 | any,
  context: Context
): Promise<APIGatewayProxyResult> {
  const city = getLocation(event.queryStringParameters?.location || event.City);
  const type = getProductType(event.queryStringParameters?.type || event.Type);
  const date = getDate(event.queryStringParameters?.date);

  const priceService = diContainer.resolve(PriceService);
  const prices = await priceService.getPrices({
    date: date,
    location: city,
    type: type
  });
  return {
    statusCode: 200,
    body: JSON.stringify(new PriceVMMapper().toListDTO(prices)),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

function getDate(date?: string): moment.Moment {
  let selectedDate: moment.Moment;
  if (!date) {
    selectedDate = trMoment();
  } else {
    selectedDate = trMoment(date);
  }
  console.log('Selected Date :', selectedDate.format());
  return selectedDate;
}
function getLocation(location: string | undefined): CityType {
  if (!location) {
    throw createHttpError(400, 'location must be defined');
  }
  const cityType = CityType[location as keyof typeof CityType];
  if (!cityType) {
    throw createHttpError(400, "location type isn't supported");
  }
  console.log('Location :', JSON.stringify({ cityType: cityType }, null, 2));
  return cityType;
}
function getProductType(type: string | undefined): ProductType {
  if (!type) {
    throw createHttpError(400, 'type must be defined');
  }
  const productType = ProductType[type as keyof typeof ProductType];
  if (!productType) {
    throw createHttpError(400, "product type isn't supported");
  }
  console.log('Product Type :', JSON.stringify({ productType }, null, 2));
  return productType;
}

const handler = middy(lambdaHandler).use(httpResponseSerializer()).use(httpErrorHandler());
export { handler, lambdaHandler };
