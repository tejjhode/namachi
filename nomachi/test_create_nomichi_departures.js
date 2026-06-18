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
      CREATE TABLE IF NOT EXISTS public.nomichi_departures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        total_seats INTEGER NOT NULL,
        seats_left INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        status TEXT DEFAULT 'active',
        departure_code TEXT,
        trip_leader TEXT,
        meeting_point TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('Sending query using "exec_sql" to create table nomichi_departures...');
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({ query_text: sqlContent })
    });

    const text = await rpcResponse.text();
    console.log('Status:', rpcResponse.status);
    console.log('Response:', text);

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  }
}

run();
