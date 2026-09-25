import { test, expect } from '@playwright/test';

test.describe('DAST: Dynamic Application Security Testing', () => {
  test('DAST-01: Validates essential security headers on public endpoints', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const headers = response.headers();

    // Verify Clickjacking protection
    expect(headers['x-frame-options']?.toUpperCase()).toBe('SAMEORIGIN');

    // Verify MIME sniffing protection
    expect(headers['x-content-type-options']).toBe('nosniff');

    // Verify Referrer-Policy
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Verify Permissions-Policy
    expect(headers['permissions-policy']).toContain('camera=()');

    // Verify no server banner leakage
    const serverHeader = headers['server'] || '';
    expect(serverHeader.toLowerCase()).not.toContain('apache');
    expect(serverHeader.toLowerCase()).not.toContain('nginx');
  });

  test('DAST-02: Sensitive files & path traversal endpoints return 404/403', async ({ request }) => {
    const sensitivePaths = [
      '/.env',
      '/.env.local',
      '/.git/HEAD',
      '/.git/config',
      '/package.json',
      '/tsconfig.json',
      '/backup.sql',
      '/../../../../etc/passwd',
      '/%2e%2e/%2e%2e/etc/passwd',
    ];

    for (const path of sensitivePaths) {
      const response = await request.get(path);
      expect(response.status(), `Expected 404 for ${path}`).toBe(404);
    }
  });

  test('DAST-03: HTTP verb tampering and TRACE method resistance', async ({ request }) => {
    // TRACE method must not echo arbitrary headers/body
    const traceResponse = await request.fetch('/', { method: 'TRACE' });
    expect([400, 404, 405]).toContain(traceResponse.status());
  });

  test('DAST-04: XSS and SQL injection query fuzzing resilience (No 500s or unescaped reflection)', async ({ request }) => {
    const payloads = [
      "<script>alert('xss')</script>",
      "'\"><svg/onload=alert(1)>",
      "' OR '1'='1' --",
      "1; DROP TABLE users; --",
      "${7*7}",
      "{{7*7}}",
    ];

    const testRoutes = ['/', '/login', '/register', '/reset-password'];

    for (const route of testRoutes) {
      for (const payload of payloads) {
        const response = await request.get(`${route}?q=${encodeURIComponent(payload)}&redirect=${encodeURIComponent(payload)}`);

        // Application must gracefully handle payload without 500 crashes
        expect(response.status(), `Failed on route ${route} with payload ${payload}`).toBeLessThan(500);

        const body = await response.text();

        // Must never leak stack traces
        expect(body).not.toContain('at Object.eval');
        expect(body).not.toContain('webpack-internal://');
        expect(body).not.toContain('SyntaxError:');

        // Raw unescaped executable script tags must not be reflected
        expect(body).not.toContain("<script>alert('xss')</script>");
        expect(body).not.toContain("<svg/onload=alert(1)>");
      }
    }
  });

  test('DAST-05: Open redirect resistance on redirect parameters', async ({ page }) => {
    const maliciousTargets = [
      'https://malicious-phishing-site.com',
      '//malicious-phishing-site.com',
      'javascript:alert(document.cookie)',
    ];

    for (const target of maliciousTargets) {
      await page.goto(`/login?redirect=${encodeURIComponent(target)}`);
      // Should remain on the legitimate host, not open external redirect
      const parsedUrl = new URL(page.url());
      expect(parsedUrl.hostname).toBe('127.0.0.1');
    }
  });
});
