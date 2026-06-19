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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: leads, error: leadErr } = await supabase.from("leads").select("id, name, status");
  const { data: profiles, error: profErr } = await supabase.from("profiles").select("id, email, role");
  const { data: departures, error: depErr } = await supabase.from("trip_departures").select("id, trip_id, start_date");
  
  console.log("Leads error:", leadErr, "Leads:", leads);
  console.log("Profiles error:", profErr, "Profiles:", profiles);
  console.log("Departures error:", depErr, "Departures:", departures);
}

main();
