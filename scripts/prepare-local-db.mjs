// Development-only helper: never touches databases that contain application tables.
import pg from "pg";
const connection =
  "postgresql://romantica:romantica-local-only@127.0.0.1:54329/";
const db = new pg.Client(connection + "romantica");
await db.connect();
const tables = await db.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public'",
);
const encoding = await db.query("SHOW server_encoding");
await db.end();
const admin = new pg.Client(connection + "postgres");
await admin.connect();
if (encoding.rows[0].server_encoding !== "UTF8") {
  if (tables.rows.length)
    throw Error("Refusing to recreate a database containing tables.");
  await admin.query("DROP DATABASE romantica");
  await admin.query(
    "CREATE DATABASE romantica WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'",
  );
}
const test = await admin.query(
  "SELECT datname FROM pg_database WHERE datname='romantica_test'",
);
if (!test.rows.length)
  await admin.query(
    "CREATE DATABASE romantica_test WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'",
  );
await admin.end();
console.log("UTF8 development and test databases ready.");
