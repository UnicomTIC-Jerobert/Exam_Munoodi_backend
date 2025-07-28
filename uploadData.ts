import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import * as fs from 'fs';
import * as path from 'path';

// --- Client Configuration (same as before) ---
const client = new DynamoDBClient({
    region: "localhost",
    endpoint: "http://localhost:8000",
    credentials: {
        accessKeyId: "dummyKeyId",
        secretAccessKey: "dummySecretKey",
    },
});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = "ALMCQTable";

// --- Helper Function (same as before) ---
const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunkedArr: T[][] = [];
    let index = 0;
    while (index < array.length) {
        chunkedArr.push(array.slice(index, size + index));
        index += size;
    }
    return chunkedArr;
};

const uploadData = async () => {
    try {
        // 1. Read all JSON files from the 'data' directory
        const dataDir = path.join(__dirname, 'data');
        const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

        if (files.length === 0) {
            console.log("No JSON files found in the 'data' directory.");
            return;
        }

        console.log(`Found data files: ${files.join(', ')}`);

        let allQuestions: any[] = [];
        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const dataString = fs.readFileSync(filePath, 'utf-8');
            const questionsFromFile = JSON.parse(dataString);
            allQuestions = allQuestions.concat(questionsFromFile);
            console.log(`- Loaded ${questionsFromFile.length} questions from ${file}`);
        }

        console.log(`\nTotal questions to upload: ${allQuestions.length}.`);

        // 2. Chunk the combined data for batch writing
        const questionChunks = chunkArray(allQuestions, 25);

        let batchCount = 0;
        for (const chunk of questionChunks) {
            batchCount++;
            console.log(`Uploading batch ${batchCount} of ${questionChunks.length}...`);

            const putRequests = chunk.map(item => ({
                PutRequest: {
                    Item: item,
                },
            }));

            const command = new BatchWriteCommand({
                RequestItems: {
                    [tableName]: putRequests,
                },
            });

            // 3. Execute the BatchWriteCommand
            await docClient.send(command);
        }

        console.log("\n✅ Successfully uploaded all question data to DynamoDB!");

    } catch (error) {
        console.error("❌ Error uploading data:", error);
    }
};

// Run the upload function
uploadData();