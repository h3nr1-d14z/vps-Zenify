import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  // Silences external beacons like Google Sites jserror pings
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  // Also handle accidental GETs
  return new NextResponse(null, { status: 204 });
}
