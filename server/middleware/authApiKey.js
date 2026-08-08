export function verifyApiKey(req, res, next) {
  // Allow all GET requests, health checks, docs, openapi spec
  if (req.method === 'GET' || req.path.startsWith('/docs') || req.path === '/openapi.json' || req.path === '/health') {
    return next();
  }

  const validKeys = new Set([
    process.env.API_KEY,
    process.env.VITE_API_KEY,
    'NEPL-API-KEY-2026',
    'TTBPq1o0KhaMicvxAvuyT3Q23qr51XgabEorbqA-kwo',
    'eubWYZJAx7wtVgaxwKqiLtAdFNp0I_HihoFbO_V5X1c',
  ].filter(Boolean));

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  // Accept if header matches any configured valid key
  if (apiKey && validKeys.has(apiKey)) {
    return next();
  }

  // If process.env.API_KEY is not set or matches default dev key, allow requests
  if (!process.env.API_KEY || process.env.API_KEY === 'NEPL-API-KEY-2026') {
    return next();
  }

  return res.status(401).json({ 
    error: 'Unauthorized: Valid API key required in x-api-key header to modify data',
    help: 'Set matching API_KEY or VITE_API_KEY environment variable on Render.com' 
  });
}
