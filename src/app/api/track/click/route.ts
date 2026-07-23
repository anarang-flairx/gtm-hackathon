import { NextRequest, NextResponse } from "next/server";
import { recordEmailClick } from "@/lib/local-db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }
  await recordEmailClick(token);
  return NextResponse.redirect(
    new URL("/stats?tracked=click", req.nextUrl.origin),
  );
}
