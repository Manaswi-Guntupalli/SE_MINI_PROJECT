import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// A real, temporary mongod process. Never reads MONGO_URI or a user's Atlas DB.
// Pin the test binary separately from the application's eventual deployment DB.
export const TEST_MONGO_VERSION = '8.0.17';
let database;
let databasePath;

export async function connectTestDatabase() {
  const temporaryRoot = fileURLToPath(new URL('../.ci-mongodb/', import.meta.url));
  mkdirSync(temporaryRoot, { recursive: true });
  databasePath = mkdtempSync(join(temporaryRoot, 'run-'));
  database = await MongoMemoryReplSet.create({
    binary: { version: TEST_MONGO_VERSION },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{
      ip: '127.0.0.1', dbName: 'oep_ci_test', dbPath: databasePath,
      // TCP-only Linux tests also work in restricted development containers.
      args: [
        ...(process.platform === 'linux' ? ['--nounixsocket'] : []),
        '--setParameter', 'diagnosticDataCollectionEnabled=false',
      ],
    }],
  });
  await mongoose.connect(database.getUri());
  return database.getUri();
}

export async function closeTestDatabase() {
  await mongoose.disconnect();
  if (database) await database.stop();
  if (databasePath) rmSync(databasePath, { recursive: true, force: true });
}
