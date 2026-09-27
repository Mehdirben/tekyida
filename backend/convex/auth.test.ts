import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPasswordProfile,
  generateNumericCode,
  generateResetToken,
  requireEnv,
  sendPasswordResetEmail,
  sendResendEmail,
  sendVerificationEmail,
} from "./auth";
import authConfig from "./auth.config";
import http from "./http";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("auth", () => {
  it("module wiring - exports auth bindings, registers HTTP routes, and exposes auth config", async () => {
    const mod = await import("./auth");
    expect(typeof mod.auth).toBe("object");
    expect(typeof mod.signIn).toBe("function");
    expect(typeof mod.signOut).toBe("function");
    expect(typeof mod.store).toBe("function");
    expect(typeof mod.isAuthenticated).toBe("function");

    const routes = http.getRoutes().map(([path]) => path);
    expect(routes).toContain("/.well-known/openid-configuration");
    expect(routes).toContain("/.well-known/jwks.json");

    expect(authConfig.providers).toHaveLength(1);
    expect(authConfig.providers[0].applicationID).toBe("convex");
    expect(authConfig.providers[0].domain).toBe(process.env.CONVEX_SITE_URL);
  });

  it("requireEnv - returns value when set and throws when missing", () => {
    vi.stubEnv("TEKYIDA_TEST_VAR", "hello");
    expect(requireEnv("TEKYIDA_TEST_VAR")).toBe("hello");

    vi.stubEnv("TEKYIDA_TEST_MISSING", undefined);
    expect(() => requireEnv("TEKYIDA_TEST_MISSING")).toThrow(
      "Missing required environment variable TEKYIDA_TEST_MISSING"
    );
  });

  it("generateNumericCode - produces a 6-digit zero-padded code", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const code = generateNumericCode();
      expect(code).toMatch(/^\d{6}$/);
      seen.add(code);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("generateResetToken - produces a 64-char hex token", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const token = generateResetToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      seen.add(token);
    }
    expect(seen.size).toBe(10);
  });

  it("sendResendEmail - posts to Resend with bearer auth and payload", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "test-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "Tekyida <no-reply@tekyida.com>");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendResendEmail({
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      from: "Tekyida <no-reply@tekyida.com>",
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    });
  });

  it("sendResendEmail - throws with API error details when the response is not ok", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "test-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "from@example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 })
      )
    );

    await expect(
      sendResendEmail({ to: "user@example.com", subject: "Hello", html: "", text: "" })
    ).rejects.toThrow('Resend error: {"message":"Invalid API key"}');
  });

  it("sendResendEmail - throws when AUTH_RESEND_KEY is missing", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", undefined);
    await expect(
      sendResendEmail({ to: "user@example.com", subject: "Hello", html: "", text: "" })
    ).rejects.toThrow("Missing required environment variable AUTH_RESEND_KEY");
  });

  it("sendVerificationEmail - sends the OTP code email", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "test-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "from@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendVerificationEmail({ identifier: "user@example.com", token: "012345" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toBe("user@example.com");
    expect(body.subject).toBe("Your Tekyida verification code");
    expect(body.text).toContain("012345");
    expect(body.html).toContain("012345");
  });

  it("sendPasswordResetEmail - sends a reset link carrying token and email params", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "test-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "from@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendPasswordResetEmail({
      identifier: "user@example.com",
      token: "abc123",
      url: "https://api.tekyida.com/api/auth/callback/email?next=/settings",
    });

    const expectedUrl = new URL(
      "/reset-password",
      "https://api.tekyida.com/api/auth/callback/email?next=/settings"
    );
    expectedUrl.searchParams.set("token", "abc123");
    expectedUrl.searchParams.set("email", "user@example.com");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toBe("user@example.com");
    expect(body.subject).toBe("Reset your Tekyida password");
    expect(body.text).toContain(expectedUrl.toString());
    expect(body.html).toContain(expectedUrl.toString());
    expect(body.html).toContain('href="' + expectedUrl.toString() + '"');
  });

  it("buildPasswordProfile - keeps trimmed name when present and omits it otherwise", () => {
    expect(buildPasswordProfile({ email: "user@example.com", name: "  Mehdi " })).toEqual({
      email: "user@example.com",
      name: "Mehdi",
    });
    expect(buildPasswordProfile({ email: "user@example.com", name: "   " })).toEqual({
      email: "user@example.com",
    });
    expect(buildPasswordProfile({ email: "user@example.com" })).toEqual({
      email: "user@example.com",
    });
  });
});
