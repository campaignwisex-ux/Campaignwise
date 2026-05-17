import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceClient } from "@/lib/supabase/service";

type ClerkEmailAddress = { email_address: string; id: string };

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
  type: "user.created" | "user.updated" | "user.deleted";
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  // Verify the webhook signature using svix
  const svixId        = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } = event.data;

    const primaryEmail =
      email_addresses.find((e) => e.id === primary_email_address_id)?.email_address ??
      email_addresses[0]?.email_address ??
      "";

    const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id, email: primaryEmail, full_name: fullName, avatar_url: image_url ?? null },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Profile upsert failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (event.type === "user.deleted") {
    const { id } = event.data;
    // Cascade deletes handle everything — just delete the profile
    await supabase.from("profiles").delete().eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
