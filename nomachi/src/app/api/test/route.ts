import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_api")
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_api")
    .insert([
      {
        name: "Tejas",
        email: "tejas@test.com",
      },
    ])
    .select();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_api")
    .update({
      name: "Updated Tejas",
    })
    .eq("email", "tejas@test.com")
    .select();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_api")
    .delete()
    .eq("email", "tejas@test.com")
    .select();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}