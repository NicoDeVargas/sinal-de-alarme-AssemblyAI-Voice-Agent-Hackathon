import "server-only";
import postgres from "postgres";

export const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, idle_timeout: 600 });
