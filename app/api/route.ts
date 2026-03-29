import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Menambahkan header keamanan
  const headers = new Headers();
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Content-Security-Policy', "default-src 'self'");

  return new Response(JSON.stringify({ message: 'API aman' }), { headers });
}