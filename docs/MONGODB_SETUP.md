
# MongoDB Development Database Setup

## OEP-13: Configure MongoDB Development Database

This document explains how to configure, start, and verify the MongoDB development database for the Online Exam Portal.

## 1. Prerequisites

Make sure the following are available:

- Node.js (version 24.x recommended by the project)
- npm
- Git
- The Online Exam Portal repository
- Internet access for the initial MongoDB binary download

The backend uses:
- MongoDB for database storage
- Mongoose for database connectivity
- dotenv for environment variables
- mongodb-memory-server-core for temporary local MongoDB

## 2. Install Backend Dependencies

Open PowerShell or the VS Code terminal.

Navigate to the server directory:

```powershell
cd C:\Users\guruv\SE_MINI_PROJECT\server
```

Install the dependencies:

```powershell
npm.cmd ci
```

The MongoDB development helper uses `mongodb-memory-server-core`, which is already declared in `server/package.json`.

## 3. Configure Environment Variables

Inside the `server` folder, create a file named:

`.env`

Add the following configuration:

```env
MONGO_URI=mongodb://127.0.0.1:27017/online_exam_portal_dev
PORT=5000
```

Explanation:

- `MONGO_URI`: MongoDB connection string used by Mongoose.
- `PORT`: Port on which the backend server runs.

The backend reads these environment variables using `dotenv`.

### Security

- Never commit `.env` to GitHub.
- Keep passwords and database credentials private.
- The repository's `.gitignore` must exclude `.env` files.
- Use separate database credentials for development and production.
- Do not hardcode database credentials in application source code.

## 4. Start the MongoDB Development Database

The project includes a temporary MongoDB helper:

`server/local-db.cjs`

Open a terminal in the server directory:

```powershell
cd C:\Users\guruv\SE_MINI_PROJECT\server
```

Run:

```powershell
node local-db.cjs
```

Expected output:

```text
Temporary MongoDB is running.
Database URL: mongodb://127.0.0.1:27017/
Keep this terminal open while using the portal.
```

The helper starts MongoDB version 8.0.17 at:

`127.0.0.1:27017`

The application uses the database:

`online_exam_portal_dev`

Keep this terminal open while running the application.

### Important

This is a temporary, in-memory development database.

Data may be lost when the MongoDB process stops.

For persistent storage, use a locally installed MongoDB server or MongoDB Atlas.

## 5. Start the Backend Server

Open a second PowerShell terminal.

Navigate to the server directory:

```powershell
cd C:\Users\guruv\SE_MINI_PROJECT\server
```

Start the backend:

```powershell
npm.cmd run dev
```

Expected output includes:

```text
Server running on port 5000
```

The backend connects to MongoDB using Mongoose and the `MONGO_URI` environment variable.

Keep the backend terminal running.

## 6. Verify the Backend

Open a browser and visit:

http://localhost:5000/

Expected JSON response:

```json
{
  "message": "Online Exam Portal API is running"
}
```

This confirms that the backend API is responding.

The database connection can be verified separately using the command in Section 8.

## 7. Verify Frontend Integration

Open the frontend in a separate terminal.

Navigate to the client directory:

```powershell
cd C:\Users\guruv\SE_MINI_PROJECT\client
```

Install dependencies if needed:

```powershell
npm.cmd ci
```

Start the frontend:

```powershell
npm.cmd run dev
```

Open the local URL displayed by Vite, normally:

http://localhost:5173/

Create a sample exam through the Instructor Exam Management interface.

Refresh the page and verify that the exam is still displayed while the temporary database is running.

## 8. Verify MongoDB Connection and Stored Data

Open another PowerShell terminal.

Navigate to the server directory:

```powershell
cd C:\Users\guruv\SE_MINI_PROJECT\server
```

Run the following command:

```powershell
node -e "require('dotenv').config(); const mongoose=require('mongoose'); (async()=>{await mongoose.connect(process.env.MONGO_URI); console.log('MongoDB connection successful'); const exams=await mongoose.connection.db.collection('exams').find({}).toArray(); console.log(JSON.stringify(exams,null,2)); await mongoose.disconnect()})().catch(e=>{console.error(e.message);process.exitCode=1})"
```

Expected output includes:

```text
MongoDB connection successful
```

If exam records exist, the command also displays the saved exam documents.

This verifies:

- MongoDB is running.
- The connection string is valid.
- Mongoose connects successfully.
- The backend's exam data can be retrieved from MongoDB.

## 9. Verify Git Security

From the project root directory, run:

```powershell
git check-ignore -v server/.env
```

Expected result: Git displays the `.gitignore` rule that excludes the file.

Then run:

```powershell
git ls-files server/.env
```

Expected result: No output.

This confirms that `server/.env` is ignored and is not currently tracked by Git.

## 10. Troubleshooting

### MongoDB connection refused

Ensure that the database helper is running:

```powershell
node local-db.cjs
```

Check that the `.env` connection string uses port `27017`.

### Port 27017 already in use

Another MongoDB instance may already be running.

Stop the conflicting instance or configure a different port consistently in the helper and `.env`.

### Missing module error

Install backend dependencies:

```powershell
npm.cmd ci
```

### Backend not responding

Check that the backend is running:

```powershell
npm.cmd run dev
```

Confirm that port `5000` is available.

### Data disappears after restart

The temporary MongoDB helper uses in-memory storage.

This is expected behavior. Use persistent MongoDB for long-term storage.

## 11. Acceptance Criteria Verification

OEP-13 requires:

1. A MongoDB development database is available.
2. The backend connects to MongoDB using Mongoose.
3. The connection string is configured through environment variables.
4. Database secrets are excluded from Git.
5. Database setup instructions are documented.
6. The database connection is verified locally.

These steps provide the configuration and verification procedure for all six requirements.

## 12. Conclusion

The Online Exam Portal supports MongoDB development database configuration through Mongoose and environment variables.

The temporary MongoDB helper allows developers to run and test the application locally without installing a persistent MongoDB service.

For production or long-term development data, a persistent MongoDB database should be configured.
