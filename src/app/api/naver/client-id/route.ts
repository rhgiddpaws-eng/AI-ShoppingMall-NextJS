import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const clientId = process.env.NAVER_MAPS_CLIENT_ID ?? ""

  return NextResponse.json(
    { clientId },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
