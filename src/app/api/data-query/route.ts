import { NextRequest, NextResponse } from "next/server";
import { pythonFetch } from "@/lib/python-client";

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const result = await pythonFetch("/data/query", {
      parsed_path: body.parsed_path,
      chart_config: body.chart_config,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Query failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
