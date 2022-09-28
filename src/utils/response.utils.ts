import { APIGatewayProxyResult } from "aws-lambda";

export function addCors(
  response: APIGatewayProxyResult,
  cors: string = "*"
): APIGatewayProxyResult {
  return {
    ...response,
    headers: {
      ...response.headers,
      "Access-Control-Allow-Origin": cors,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
  };
}
