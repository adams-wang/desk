import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || "/Volumes/Data/quant/data/stocks.db";

// Singleton instance - reused across API routes
// Readonly mode to avoid blocking the quant pipeline
// Position management will need a separate writable connection when implemented
const db = new Database(DB_PATH, { readonly: true });

export default db;
