import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', req.url))
  response.cookies.set('user_id', '', {
    httpOnly: true,
    expires: new Date(0), // immediately expire
    path: '/',
  })
  return response
}