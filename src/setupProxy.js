const { createProxyMiddleware } = require('http-proxy-middleware');

// Dev-only proxy to avoid CORS during local development.
// Requests from the React app to paths starting with /webhook-test
// will be proxied to the remote server with the same path.
module.exports = function(app) {
  app.use(
    '/webhook-test',
    createProxyMiddleware({
      target: 'https://server3.automationlearners.pro',
      changeOrigin: true,
      secure: true,
      logLevel: 'warn',
    })
  );

  // Also support `/webhook/*` in case env vars are set to that prefix
  app.use(
    '/webhook',
    createProxyMiddleware({
      target: 'https://server3.automationlearners.pro',
      changeOrigin: true,
      secure: true,
      logLevel: 'warn',
    })
  );
};
