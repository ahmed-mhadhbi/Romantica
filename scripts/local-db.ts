import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
const pg = new EmbeddedPostgres({
  databaseDir: ".postgres",
  user: "romantica",
  password: "romantica-local-only",
  port: 54329,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
});
if (!existsSync(".postgres/PG_VERSION")) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("romantica");
} catch {
  /* Database already exists on subsequent starts. */
}
console.log("Local PostgreSQL ready on port 54329. Keep this process open.");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
