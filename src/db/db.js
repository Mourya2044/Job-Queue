import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.PGHOST ?? 'localhost',
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD ?? 'postgres',
    database: process.env.PGDATABASE ?? 'jobqueue',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxLifetimeSeconds: 60
})

export default pool;