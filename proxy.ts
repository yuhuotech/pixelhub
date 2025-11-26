import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function proxy(request: NextRequest) {
    const session = request.cookies.get('session')?.value
    const { pathname } = request.nextUrl

    // Allow public paths
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth/login') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)
    ) {
        return NextResponse.next()
    }

    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
        await decrypt(session)
        return NextResponse.next()
    } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
