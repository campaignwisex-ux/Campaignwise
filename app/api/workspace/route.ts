import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encrypt } from "@/lib/encrypt";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, subdomain, client_id, bu_name, account_id, from_domain, is_active, last_synced_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspace: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { subdomain, client_id, client_secret, bu_name, account_id, from_domain } = body;

  if (!subdomain || !client_id || !client_secret) {
    return NextResponse.json(
      { error: "subdomain, client_id and client_secret are required" },
      { status: 400 }
    );
  }

  const client_secret_enc = encrypt(client_secret);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("workspaces")
    .upsert(
      {
        user_id: userId,
        platform: "sfmc",
        subdomain: subdomain.trim(),
        client_id: client_id.trim(),
        client_secret_enc,
        bu_name: bu_name?.trim() || null,
        account_id: account_id?.trim() || null,
        from_domain: from_domain?.trim() || null,
        is_active: true,
      },
      { onConflict: "user_id,subdomain" }
    )
    .select("id, subdomain, client_id, bu_name, account_id, from_domain, is_active, last_synced_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspace: data });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ is_active: false })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

