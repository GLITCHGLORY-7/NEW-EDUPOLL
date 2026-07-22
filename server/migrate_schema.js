const { Client } = require('pg');

const password = 'kDupEbzc2Tdqj5dX';
const projectRef = 'mtevjqgkenpczjtvneac';

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
  'ca-central-1', 'sa-east-1'
];

async function run() {
  for (const region of regions) {
    const connectionString = `postgres://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    console.log(`Trying region ${region}...`);
    
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`Connected successfully in region ${region}!`);

      console.log('Adding hidden_from_history column to responses...');
      await client.query('ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS hidden_from_history BOOLEAN DEFAULT FALSE;');
      
      console.log('Adding is_deleted column to messages...');
      await client.query('ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;');
      
      console.log('Schema migration completed successfully!');
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed for region ${region}: ${err.message}`);
    } finally {
      client.end();
    }
  }
  console.error('Failed to connect and apply migrations in all regions.');
}

run();
