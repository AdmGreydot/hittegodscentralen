import { NextResponse, type NextRequest } from "next/server";
import { processItemExpiry } from "../../../../lib/notifications";

// Called once a day by Vercel Cron (see vercel.json), which sends `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await processItemExpiry());
  } catch (error) {
    console.error("item expiry failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
