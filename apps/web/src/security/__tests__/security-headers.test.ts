import nextConfig from "../../../next.config";

describe("web security headers", () => {
  it("does not expose the framework powered-by header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sets defensive headers for every route", async () => {
    const headers = await nextConfig.headers?.();
    const route = headers?.find((entry) => entry.source === "/(.*)");
    const values = new Map(route?.headers.map((header) => [header.key, header.value]));

    expect(values.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(values.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(values.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("Permissions-Policy")).toContain("camera=()");
  });
});
