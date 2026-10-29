// ACAD runtime entrypoint. Existing React application remains served as static assets.
// Backend functionality will be added only after the D1 binding and access rules are ready.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/acad-api/')) {
      return new Response(JSON.stringify({ error: 'API not enabled' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    }
    return env.ASSETS.fetch(request)
  },
}
