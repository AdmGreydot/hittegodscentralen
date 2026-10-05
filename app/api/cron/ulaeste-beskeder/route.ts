import { NextResponse, type NextRequest } from "next/server";
import { sendUnreadReminders } from "../../../../lib/notifications";

// Called once a day by Vercel Cron (see vercel.json), which sends `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await sendUnreadReminders());
  } catch (error) {
    console.error("unread reminders failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
