import * as moment from 'moment-timezone'
import { DynamoDBClient, } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

const docClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(docClient)

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    const location = event.queryStringParameters?.location;
    const type = event.queryStringParameters?.type;
    let date = event.queryStringParameters?.date;
    let from: string;
    let to: string;
    if (!date) {
        from = moment.tz("Europe/Istanbul").startOf('day').format()
        to = moment.tz("Europe/Istanbul").endOf('day').format()
    } else {
        from = moment.tz(date, "Europe/Istanbul").startOf("day").format()
        to = moment.tz(date, "Europe/Istanbul").endOf('day').format()
    }
    console.log(JSON.stringify({ from, to }, null, 2));
    const command = new QueryCommand({
        TableName: "HalPrices",
        IndexName: "PriceLocationIndex",
        KeyConditionExpression: "#Location = :Location and #TS BETWEEN :from AND :to",
        ExpressionAttributeNames: {
            "#Location": "Location",
            "#TS": "TS"
        },
        ExpressionAttributeValues: {
            ":Location": `${location}#${type}`,
            ":from": from,
            ":to": to
        }
    })

    const products = await documentClient.send(command)
    console.log(products);

    return {
        body: JSON.stringify([
            { todoId: 1, text: 'walk the dog 🐕' },
            { todoId: 2, text: 'cook dinner 🥗' },
        ]),
        statusCode: 200,
    };
}
