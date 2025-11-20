import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Or like this if you need to do something here.
// export default auth((req) => {
//   console.log(req.auth) //  { session: { user: { ... } } }
// })

// Read more: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/.well-known/jwks/:path*',
    '/:path*/did.json',
  ],
}
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // JWKS proxy
  if (pathname.startsWith('/.well-known/jwks/')) {
    const agentBaseUrl = process.env.BROWSER_PUBLIC_AGENT_BASE_URL
    if (agentBaseUrl) {
      const targetUrl = `${agentBaseUrl}${pathname}${search}`
      return NextResponse.rewrite(targetUrl)
    }
  }

  // DID:WEB proxy
  if (pathname.endsWith('/did.json')) {
    const agentBaseUrl = process.env.BROWSER_PUBLIC_AGENT_BASE_URL
    if (agentBaseUrl) {
      const targetUrl = `${agentBaseUrl}${pathname}${search}`
      return NextResponse.rewrite(targetUrl)
    }
  }

  return NextResponse.next()
}

