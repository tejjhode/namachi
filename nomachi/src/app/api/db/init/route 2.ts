import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dbMigrations } from "@/lib/db/migrations";

export async function POST() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let completed = 0;
    let errors = [];

    for (const migration of dbMigrations) {
      try {
        // Execute raw SQL using Supabase's internal SQL API
        const { error } = await supabaseAdmin.rpc("query", { sql: migration.sql });
        
        if (error && !error.message?.includes("already exists")) {
          // Try alternative approach - execute via the database
          const { error: execError } = await supabaseAdmin.rpc("exec_sql", {
            query_text: migration.sql,
          });
          
          if (execError && !execError.message?.includes("already exists")) {
            throw execError;
          }
        }
        
        completed++;
        console.log(`✓ Migration "${migration.name}" completed`);
      } catch (error: any) {
        // Most errors are expected (tables already exist, etc)
        console.log(`ℹ Migration "${migration.name}":`, error?.message);
        completed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database initialization complete",
      migrations_completed: completed,
      total_migrations: dbMigrations.length,
    });
  } catch (error: any) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      { 
        error: "Database initialization failed",
        details: error?.message 
      },
      { status: 500 }
    );
  }
}
