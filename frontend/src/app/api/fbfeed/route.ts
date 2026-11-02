/* GET /api/fbfeed?after=<cursor> — Facebook feed-ийн дараагийн хуудас ("Цааш" товч, components/fbfeed/FacebookFeed.tsx).
   Page токен зөвхөн server дээр (graph.ts) хэрэглэгдэнэ; client-д FeedResult JSON л очно. */

import { NextResponse, type NextRequest } from "next/server";
import { fetchFeed } from "@/components/fbfeed/graph";

export async function GET(req: NextRequest) {
  const after = req.nextUrl.searchParams.get("after") ?? undefined;
  if (after !== undefined && (after.length === 0 || after.length > 1024)) {
    return NextResponse.json({ ok: false, reason: "error", message: "after cursor буруу." }, { status: 400 });
  }
  const result = await fetchFeed({ after });
  const status = result.ok ? 200 : result.reason === "unconfigured" ? 503 : 502;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
