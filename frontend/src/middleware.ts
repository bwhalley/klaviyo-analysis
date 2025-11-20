export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/analysis/:path*', '/settings/:path*'],
}

