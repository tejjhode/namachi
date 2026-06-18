const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables from .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../../../../Documents/namachi/nomachi/.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Supabase URL:", env.NEXT_PUBLIC_SUPABASE_URL);
  
  // 1. Check profiles table structure by fetching one record
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
  if (pError) {
    console.error("Error fetching profiles:", pError);
  } else {
    console.log("Profiles columns:", profiles && profiles.length > 0 ? Object.keys(profiles[0]) : "No rows found, fetching columns via schema query...");
  }
  
  // 2. Fetch column names directly via query_text
  // Since exec_sql returns void, we can define a temporary function or read information_schema using supabase API
  // Actually, we can fetch all schemas using a query on information_schema, but supabase from() only works on exposed tables.
  // Wait! We can alter the exec_sql function or write a new one to return JSON!
  const createFunc = `
    CREATE OR REPLACE FUNCTION public.run_sql_query(query_text TEXT)
    RETURNS JSON AS $$
    DECLARE
      ret JSON;
    BEGIN
      EXECUTE 'SELECT json_agg(t) FROM (' || query_text || ') t' INTO ret;
      RETURN ret;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  await supabase.rpc('exec_sql', { query_text: createFunc });
  console.log("Created public.run_sql_query RPC.");
  
  // Query 1: Get columns
  const { data: cols, error: colsErr } = await supabase.rpc('run_sql_query', {
    query_text: "SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'profiles'"
  });
  
  if (colsErr) {
    console.error("Error running columns query:", colsErr);
  } else {
    console.log("Profiles table columns:");
    console.table(cols);
  }

  // Query 2: Get check constraints
  const { data: cons, error: consErr } = await supabase.rpc('run_sql_query', {
    query_text: `
      SELECT 
        conname AS constraint_name, 
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM 
        pg_constraint c
      JOIN 
        pg_namespace n ON n.oid = c.connamespace
      WHERE 
        conrelid = 'public.profiles'::regclass;
    `
  });
  
  if (consErr) {
    console.error("Error running constraints query:", consErr);
  } else {
    console.log("Profiles check constraints:");
    console.table(cons);
  }
}

main().catch(console.error);
