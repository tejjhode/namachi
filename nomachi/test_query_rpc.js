const fs = require('fs');

async function run() {
  try {
    const envPath = './.env.local';

    if (!fs.existsSync(envPath)) {
      throw new Error(`Env file not found at ${envPath}`);
    }

    const envFile = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    const sqlContent = `
      ALTER TABLE public.trip_departures ADD COLUMN IF NOT EXISTS departure_code TEXT;
      ALTER TABLE public.trip_departures ADD COLUMN IF NOT EXISTS meeting_point TEXT;
      ALTER TABLE public.trip_departures ADD COLUMN IF NOT EXISTS trip_leader TEXT;
      ALTER TABLE public.trip_departures ADD COLUMN IF NOT EXISTS notes TEXT;
    `;

    console.log('Sending query using "query" RPC...');
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({ sql: sqlContent })
    });

    const text = await rpcResponse.text();
    console.log('Status:', rpcResponse.status);
    console.log('Response:', text);

  } catch (error) {
    console.error('❌ Error altering schema:', error.message);
  }
}

run();
