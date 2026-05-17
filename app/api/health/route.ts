import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Missing env vars", url: !!url, key: !!key });
  }

  try {
    const res = await fetch(`${url}/rest/v1/profiles?limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return NextResponse.json({ ok: res.ok, status: res.status, url });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), url });
  }
}
