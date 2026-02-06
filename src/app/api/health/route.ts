import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export async function GET() {
  const response = new NextResponse(JSON.stringify(env), { status: 200 });

  return response;
}
