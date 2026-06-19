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
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, status, step, source_kind, source_id, related_to")
    .order("step", { ascending: true });
    
  if (error) {
    console.error(error);
  } else {
    console.log("Current Tasks in DB:", tasks);
  }
}

main();
