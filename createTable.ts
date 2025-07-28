import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

// Configure the client to connect to the local DynamoDB instance
const client = new DynamoDBClient({
    region: "localhost",
    endpoint: "http://localhost:8000",
    // Dummy credentials for local instance
    credentials: {
        accessKeyId: "dummyKeyId",
        secretAccessKey: "dummySecretKey",
    },
});

const createTable = async () => {
    const command = new CreateTableCommand({
        TableName: "ALMCQTable",
        AttributeDefinitions: [
            { AttributeName: "subject", AttributeType: "S" }, // Main table PK
            { AttributeName: "year#questionNum", AttributeType: "S" }, // Main table SK
            { AttributeName: "year", AttributeType: "N" }, // GSI PK
            { AttributeName: "mainTopic", AttributeType: "S" }, // GSI SK
        ],
        KeySchema: [
            { AttributeName: "subject", KeyType: "HASH" }, // HASH = Partition Key
            { AttributeName: "year#questionNum", KeyType: "RANGE" }, // RANGE = Sort Key
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "YearIndex",
                KeySchema: [
                    { AttributeName: "year", KeyType: "HASH" },
                    { AttributeName: "mainTopic", KeyType: "RANGE" },
                ],
                Projection: {
                    ProjectionType: "ALL", // Project all attributes to the GSI
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5,
                },
            },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
        },
    });

    try {
        const response = await client.send(command);
        console.log("✅ Table created successfully:", response.TableDescription?.TableName);
    } catch (error) {
        if (error instanceof Error && error.name === 'ResourceInUseException') {
            console.warn("⚠️ Table already exists. Skipping creation.");
        } else {
            console.error("❌ Error creating table:", error);
        }
    }
};

createTable();