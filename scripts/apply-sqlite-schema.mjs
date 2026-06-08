import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../packages/database/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sqlPath = new URL("../.tools/sqlite-schema.sql", import.meta.url);
const sql = fs.readFileSync(sqlPath, "utf8");
const statements = sql
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean);

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log(`Applied ${statements.length} SQLite statements.`);
} finally {
  await prisma.$disconnect();
}
