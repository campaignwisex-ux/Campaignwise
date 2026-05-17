import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncWorkspace } from "@/lib/sfmc-sync";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncWorkspace(userId);

  const status = result.errors.length > 0 && result.campaignsSynced === 0 ? 500 : 200;
  return NextResponse.json(result, { status });
}
