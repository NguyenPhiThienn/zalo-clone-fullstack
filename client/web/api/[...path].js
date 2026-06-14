const BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'http://34.59.79.51:8080';

export default async function handler(req, res) {
  try {
    const { path } = req.query;
    const segments = Array.isArray(path) ? path : [path];
    const targetPath = segments.join('/');

    const queryParams = Object.entries(req.query)
      .filter(([key]) => key !== 'path')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const targetUrl = `${BACKEND_URL}/api/${targetPath}${queryParams ? '?' + queryParams : ''}`;
    console.log(`[proxy] ${req.method} ${targetUrl}`);

    const headers = { 'Content-Type': 'application/json' };
    if (req.headers['authorization']) {
      headers['Authorization'] = req.headers['authorization'];
    }

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    res.status(response.status);
    res.setHeader('Content-Type', 'application/json');

    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (error) {
    console.error('[proxy error]', error);
    res.status(502).json({ error: 'Proxy error', message: error.message });
  }
}
