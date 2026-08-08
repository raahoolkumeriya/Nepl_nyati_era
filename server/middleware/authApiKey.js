export function verifyApiKey(req, res, next) {
  // Allow all GET requests, health checks, docs, openapi spec
  if (req.method === 'GET' || req.path.startsWith('/docs') || req.path === '/openapi.json' || req.path === '/health') {
    return next();
  }

  const validKeys = new Set([
    process.env.API_KEY,
    process.env.VITE_API_KEY,
  ].filter(Boolean));

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  // Accept if header matches configured environment API key
  if (apiKey && validKeys.has(apiKey)) {
    return next();
  }

  // If no environment API key is configured (local development), allow requests
  if (validKeys.size === 0) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Valid API key required in x-api-key header to modify data',
    help: 'Set matching API_KEY or VITE_API_KEY environment variable on Render.com'
  });
}
