import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/encrypt";
import { testSFMCConnection } from "@/lib/sfmc";

// POST /api/workspace/test
// Tests credentials either from the saved workspace OR from a request body
// (so the user can test before hitting Save).
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { subdomain, client_id, client_secret, account_id } = body as Record<string, string>;

  let testCreds: { clientId: string; clientSecret: string; subdomain: string; accountId?: string };

  if (subdomain && client_id && client_secret) {
    // Test with credentials supplied directly (pre-save test)
    testCreds = {
      subdomain: subdomain.trim(),
      clientId: client_id.trim(),
      clientSecret: client_secret.trim(),
      accountId: account_id?.trim() || undefined,
    };
  } else {
    // Fall back to saved workspace
    const supabase = createServiceClient();
    const { data: ws } = await supabase
      .from("workspaces")
      .select("subdomain, client_id, client_secret_enc, account_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!ws) {
      return NextResponse.json(
        { ok: false, error: "No connected workspace found." },
        { status: 404 }
      );
    }

    testCreds = {
      subdomain: ws.subdomain,
      clientId: ws.client_id,
      clientSecret: decrypt(ws.client_secret_enc),
      accountId: ws.account_id ?? undefined,
    };
  }

  const result = await testSFMCConnection(testCreds);
  return NextResponse.json(result);
}
