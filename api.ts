import express from 'express';
import cors from 'cors';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

// --- DynamoDB Client Setup (for Local Development) ---
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

// --- Express App Setup ---
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// --- API Endpoints ---

// Endpoint 1: Get Questions by Year (Already built)
app.get('/questions/year/:year', async (req, res) => {
  // ... (code from previous step) ...
  const year = parseInt(req.params.year, 10);
  if (isNaN(year)) { return res.status(400).json({ error: 'Year must be a valid number.' }); }
  const command = new QueryCommand({
    TableName: tableName,
    IndexName: 'YearIndex',
    KeyConditionExpression: '#yr = :yyyy',
    ExpressionAttributeNames: { '#yr': 'year' },
    ExpressionAttributeValues: { ':yyyy': year },
  });
  try {
    const { Items } = await docClient.send(command);
    res.status(200).json(Items || []);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch data.' });
  }
});

// Endpoint 2: Get Questions by Main Topic
app.get('/questions/:subject/:mainTopic', async (req, res) => {
  const { subject, mainTopic } = req.params;

  console.log(`Fetching questions for Subject: ${subject}, Topic: ${mainTopic}`);

  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: '#sub = :subjectValue and begins_with(#yt, :topicValue)',
    ExpressionAttributeNames: {
      '#sub': 'subject',
      '#yt': 'mainTopic', // Note: GSI PK is mainTopic, not year#questionNum in this case
    },
    ExpressionAttributeValues: {
      ':subjectValue': subject.toUpperCase(),
      ':topicValue': mainTopic.toUpperCase(),
    },
  });

  try {
    const { Items } = await docClient.send(command);
    console.log(`Found ${Items?.length || 0} questions.`);
    res.status(200).json(Items || []);
  } catch (error) {
    console.error("Error fetching data from DynamoDB:", error);
    res.status(500).json({ error: 'Could not fetch data.' });
  }
});

// Endpoint 3: Get Questions by Main Topic
app.get('/questions/topic/:subject/:mainTopic', async (req, res) => {
  const { subject, mainTopic } = req.params;

  // Basic validation
  if (!subject || !mainTopic) {
    return res.status(400).json({ error: 'Subject and Main Topic are required.' });
  }

  console.log(`Fetching questions for subject: ${subject}, topic: ${mainTopic}...`);

  const command = new QueryCommand({
    TableName: tableName,
    // Step 1: Query using the Primary Key (PK).
    // This efficiently gets all items for the given subject.
    KeyConditionExpression: '#sub = :subjectVal',
    
    // Step 2: Filter the results from the query.
    // This part runs *after* the query and removes items that don't match.
    FilterExpression: '#mainTopic = :mainTopicVal',
    
    // Define placeholders for attribute names to avoid reserved keyword issues
    ExpressionAttributeNames: {
      '#sub': 'subject',
      '#mainTopic': 'mainTopic',
    },
    
    // Provide the actual values for the placeholders
    ExpressionAttributeValues: {
      ':subjectVal': subject.toUpperCase(),
      ':mainTopicVal': mainTopic.toUpperCase(),
    },
  });

  try {
    const { Items } = await docClient.send(command);
    console.log(`Found ${Items?.length || 0} questions matching the filter.`);
    res.status(200).json(Items || []);
  } catch (error) {
    console.error("Error fetching data from DynamoDB:", error);
    res.status(500).json({ error: 'Could not fetch data from database.' });
  }
});


// Endpoint 3: Get All Topics and Sub-topics for a Subject
app.get('/topics/:subject', async (req, res) => {
  const { subject } = req.params;
  console.log(`Fetching all topics for subject: ${subject}`);

  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: '#sub = :subjectValue',
    ProjectionExpression: 'mainTopic, subTopic', // Only fetch the fields we need
    ExpressionAttributeNames: { '#sub': 'subject' },
    ExpressionAttributeValues: { ':subjectValue': subject.toUpperCase() }
  });

  try {
    const { Items } = await docClient.send(command);
    if (!Items) {
      return res.status(200).json({});
    }

    const topicMap: { [key: string]: Set<string> } = {};

    Items.forEach(item => {
      if (!topicMap[item.mainTopic]) {
        topicMap[item.mainTopic] = new Set<string>();
      }
      topicMap[item.mainTopic].add(item.subTopic);
    });

    // Convert sets to arrays for the JSON response
    const response: { [key: string]: string[] } = {};
    for (const topic in topicMap) {
      response[topic] = Array.from(topicMap[topic]);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error scanning for topics:", error);
    res.status(500).json({ error: 'Could not fetch topics.' });
  }
});


// Endpoint 4: Get Questions by Complex Filters (for Quiz Generation)
app.get('/quiz', async (req, res) => {
  const { subject, mainTopic, subTopic, complexity, year } = req.query;

  if (!subject) {
    return res.status(400).json({ error: 'Subject is a required query parameter.' });
  }

  // This is a Scan operation, which can be slow on large tables. 
  // For our app size, it's fine. For a massive app, you'd use more GSIs.

  let FilterExpression = '#sub = :subjectValue';
  const ExpressionAttributeNames: any = { '#sub': 'subject' };
  const ExpressionAttributeValues: any = { ':subjectValue': (subject as string).toUpperCase() };

  if (mainTopic) {
    FilterExpression += ' AND #mt = :mainTopicValue';
    ExpressionAttributeNames['#mt'] = 'mainTopic';
    ExpressionAttributeValues[':mainTopicValue'] = (mainTopic as string).toUpperCase();
  }
  if (subTopic) {
    FilterExpression += ' AND #st = :subTopicValue';
    ExpressionAttributeNames['#st'] = 'subTopic';
    ExpressionAttributeValues[':subTopicValue'] = (subTopic as string).toUpperCase();
  }
  if (complexity) {
    FilterExpression += ' AND #cpx = :complexityValue';
    ExpressionAttributeNames['#cpx'] = 'complexity';
    ExpressionAttributeValues[':complexityValue'] = parseInt(complexity as string, 10);
  }
  if (year) {
    FilterExpression += ' AND #yr = :yearValue';
    ExpressionAttributeNames['#yr'] = 'year';
    ExpressionAttributeValues[':yearValue'] = parseInt(year as string, 10);
  }

  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  });

  try {
    const { Items } = await docClient.send(command);
    res.status(200).json(Items || []);
  } catch (error) {
    console.error("Error scanning for quiz:", error);
    res.status(500).json({ error: 'Could not fetch quiz data.' });
  }
});


// Endpoint 5: Get ALL questions (for the admin panel)
app.get('/questions', async (req, res) => {
  console.log("Fetching all questions for admin panel...");

  const command = new ScanCommand({
    TableName: tableName,
  });

  try {
    const { Items } = await docClient.send(command);
    console.log(`Found ${Items?.length || 0} total questions.`);
    // Sorting them by year and question number for a clean display
    Items?.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.questionNum - b.questionNum;
    });
    res.status(200).json(Items || []);
  } catch (error) {
    console.error("Error fetching all questions:", error);
    res.status(500).json({ error: 'Could not fetch data.' });
  }
});


// --- Start the Server ---
app.listen(port, () => {
  console.log(`🚀 API server is running at http://localhost:${port}`);
});