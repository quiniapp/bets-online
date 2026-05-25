import path from 'path';
import dotenv from 'dotenv';

// Load the .env.local file from the api directory before any module that validates env vars
const envPath = path.resolve(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

// Ensure NODE_ENV is set to something the schema accepts
process.env.APP_ENV = 'local';
