import { test, expect } from '@playwright/test';

test.describe('PWA & Assets E2E', () => {
  test('should serve a valid web manifest with standalone display', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toContain('Tekyida');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/app');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should serve service worker script with 200 OK', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text.length).toBeGreaterThan(10);
  });

  test('should render favicon successfully', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    expect(response.status()).toBe(200);
  });
});
