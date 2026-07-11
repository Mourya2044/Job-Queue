import { Client } from "pg";
import fs from "fs";
import "dotenv/config";

const client = new Client({
  host: process.env.PGHOST ?? "localhost",
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "postgres",
  database: process.env.PGDATABASE ?? "jobqueue",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
});

const dir = import.meta.dirname;
const sql = fs.readFileSync(`${dir}/schema.sql`, "utf8");

export const initDB = async () => {
    try {
        await client.connect();
        await client.query(sql);
        console.log("Database initialized successfully");
    } catch (error) {
        console.error("Error initializing database:", error);
    } finally {
        await client.end();
    }
};

initDB();