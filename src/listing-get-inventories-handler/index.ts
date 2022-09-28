import "reflect-metadata";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import {
  APIGatewayProxyEventV2,
  Context,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { diContainer } from "../core/di-registry";
import { InvToInvVMMapper as ItemVMMapper } from "../mappers/inv-to-inv-vm.mapper";
import InventoryRepository from "../repositories/inventory.repository";

const lambdaHandler = async function (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  const repo = diContainer.resolve<InventoryRepository>("InventoryRepository");
  const items = await repo.getAllItems();
  return {
    statusCode: 200,
    body: JSON.stringify(new ItemVMMapper().toListDTO(items)),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const handler = middy(lambdaHandler)
  .use(httpResponseSerializer())
  .use(httpErrorHandler())
  .use(cors());

export { handler, lambdaHandler };
