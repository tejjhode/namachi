const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('./.env.local', 'utf8');
const env = {};
envFile.replace(/\r/g, '').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

console.log("Parsed URL:", env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.rpc('run_sql_query', {
    query_text: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  });
  if (error) {
    console.error("Error fetching tables:", error);
  } else {
    console.log("Tables in public schema:", data);
  }
}

main();
