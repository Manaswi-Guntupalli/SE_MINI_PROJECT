
"use strict";

const { MongoMemoryServer } = require("mongodb-memory-server-core");

async function startDatabase() {
  const database = await MongoMemoryServer.create({
    binary: {
      version: "8.0.17",
    },
    instance: {
      ip: "127.0.0.1",
      port: 27017,
      dbName: "online_exam_portal_dev",
    },
  });

  console.log("Temporary MongoDB is running.");
  console.log("Database URL:", database.getUri());
  console.log("Keep this terminal open while using the portal.");

  const shutdown = async () => {
    await database.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startDatabase().catch((error) => {
  console.error("Could not start temporary MongoDB:", error.message);
  process.exitCode = 1;
});
