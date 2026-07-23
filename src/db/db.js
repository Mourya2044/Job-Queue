import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.PGHOST ?? 'localhost',
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD ?? 'postgres',
    database: process.env.PGDATABASE ?? 'jobqueue',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    ssl: process.env.PGSSLMODE ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
})

export default pool;