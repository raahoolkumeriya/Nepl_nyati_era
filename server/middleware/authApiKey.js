export function verifyApiKey(req, res, next) {
  // Allow all GET requests and docs endpoints without key
  if (req.method === 'GET' || req.path.startsWith('/docs') || req.path === '/openapi.json') {
    return next();
  }

  const expectedKey = process.env.API_KEY || 'NEPL-API-KEY-2026';
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ 
      error: 'Unauthorized: Valid API key required in x-api-key header to modify data',
      help: 'Use header: x-api-key: NEPL-API-KEY-2026 or click Authorize 🔒 in Swagger UI' 
    });
  }

  next();
}
