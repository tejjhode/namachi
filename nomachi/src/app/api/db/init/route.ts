import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db/init";

export async function POST() {
  try {
    const success = await initializeDatabase();

    if (!success) {
      return NextResponse.json(
        { success: false, message: "Database initialization completed with warnings." },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to initialize database." },
      { status: 500 }
    );
  }
}

