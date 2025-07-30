# Exam Munoodi - Backend API

## Project Summary

Exam Munoodi is a comprehensive educational platform designed to help Sri Lankan A/L students practice past MCQ questions. This backend repository contains the Node.js API that serves the question data for multiple subjects: Physics, Chemistry, Science for Technology (SFT), and Engineering Technology (ET).

The API is built with a modern, scalable tech stack and connects to a DynamoDB database, providing endpoints for fetching, creating, updating, and deleting question data.

**Tech Stack:**
*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** AWS DynamoDB (with DynamoDB Local for development)
*   **Environment:** Docker

## Core Features

This API provides the necessary data services for the Exam Munoodi student and admin applications. It allows frontends to:
*   Fetch lists of available subjects, years, and topics.
*   Query for questions based on various filters (subject, year, topic).
*   (Future) Add, update, and delete questions via a secure admin panel.

---

## 🚀 Local Development Setup Guide

This guide provides a complete, step-by-step process to set up the development environment, create the database, populate it with data, and run the API server locally.

### Prerequisites

1.  **Node.js & npm:** Ensure Node.js (version 18.x or higher) and npm are installed. You can download it from [nodejs.org](https://nodejs.org/).
2.  **Docker Desktop:** This is required to run the local database. Download and install it from [docker.com](https://www.docker.com/products/docker-desktop/).

### Step 1: Initial Project Setup

Clone the repository and install the necessary dependencies.

```bash
# 1. Clone this project to your local machine
git clone https://github.com/UnicomTIC-Jerobert/Exam_Munoodi_backend.git

# 2. Navigate into the project directory
cd Exam_Munoodi_backend

# 3. Install the required Node.js packages
npm install
```
### Step 2: Running the Local Database with Docker

We use Docker to run an instance of DynamoDB, which avoids the need for an AWS account during development.

1.  **Start Docker Desktop:** Make sure the Docker Desktop application is running on your machine. You should see the whale icon in your system tray or menu bar.

2.  **Create a Docker Network:** This allows different services to communicate. You only need to run this command once.
    ```bash
    docker network create my-app-network
    ```

3.  **Run the DynamoDB Local Container:** This command downloads and starts the database container in the background.
    ```bash
    docker run -d --name dynamodb-local --network my-app-network -p 8000:8000 amazon/dynamodb-local
    ```

    **Managing the Database Container:**
    *   To verify it's running: `docker ps`
    *   To stop the database: `docker stop dynamodb-local`
    *   To start it again later (after a restart): `docker start dynamodb-local`

### Step 3: Create and Populate the Database

With the database container running, execute the following scripts using `ts-node`.

1.  **Create the Table Structure:** This script creates the `ALMCQTable` and its secondary index. Run this only the first time you set up the project.
    ```bash
    npx ts-node createTable.ts
    ```

2.  **Populate the Table with Data:** This script reads all the `.json` files from the `/data` directory and uploads the questions to your local database.
    ```bash
    npx ts-node uploadData.ts
    ```

### Step 4: Run the API Server

Finally, start the Express.js API server.

```bash
npx ts-node api.ts
```
The server will now be running and accessible at **`http://localhost:3001`**. Your backend is fully set up and ready to receive requests.






