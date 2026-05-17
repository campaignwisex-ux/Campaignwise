import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, company, platform, challenge } = body as Record<string, string>;

  if (!name?.trim() || !email?.trim() || !company?.trim() || !platform?.trim()) {
    return NextResponse.json({ error: "Name, email, company and platform are required." }, { status: 400 });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("early_access_requests").insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    company: company.trim(),
    platform: platform.trim(),
    challenge: challenge?.trim() || null,
  });

  if (error) {
    console.error("Early access insert failed:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  console.log(`[early-access] New request: ${name} <${email}> — ${company} (${platform})`);
  return NextResponse.json({ success: true });
}
