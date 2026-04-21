import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Rotas públicas que não exigem autenticação
const PUBLIC_PATHS = [
  '/login',
  '/api/login',
  '/api/register',
  '/api/forgot-password',
  '/api/reset-password',
  '/api/logout',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return NextResponse.next();
  } catch {
    // Token inválido ou expirado — limpa cookie e redireciona
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
    return response;
  }
}

export const config = {
  // Executa em todas as rotas exceto assets estáticos do Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|images/).*)'],
};
