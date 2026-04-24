import "reflect-metadata";
import { beforeAll, afterAll, beforeEach } from "vitest";

import { TestDataSource } from "@/__tests__/db.config";

beforeAll(async () => {
  // initialize the test database
  await TestDataSource.initialize();
});

afterAll(async () => {
  // Close the connection after all tests
  await TestDataSource.dropDatabase();
  await TestDataSource.destroy();
});

beforeEach(async () => {
  // Wipe all tables before each test for isolation
  const entities = TestDataSource.entityMetadatas;
  for (const entity of entities.reverse()) {
    const repo = TestDataSource.getRepository(entity.name);
    // await repo.clear(); // cleared cause it uses
    await repo.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
  // Re-enable FK constraints
  await TestDataSource.query("SET session_replication_role = 'origin'");
});
