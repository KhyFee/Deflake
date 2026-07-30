import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'deflake',
    version: '0.1.0',
    author: 'KhyFee',
    ok: true,
  })
}
