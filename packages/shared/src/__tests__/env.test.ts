import { __resetEnvCache, envSchema, getEnv, loadEnv } from "../env.js";

describe("env schema", () => {
  describe("validation", () => {
    it("accepts an empty env (defaults applied)", () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("development");
      }
    });

    it("accepts NODE_ENV=production", () => {
      const result = envSchema.safeParse({ NODE_ENV: "production" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("production");
      }
    });

    it("rejects an invalid NODE_ENV value", () => {
      const result = envSchema.safeParse({ NODE_ENV: "staging" });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid DATABASE_URL", () => {
      const result = envSchema.safeParse({ DATABASE_URL: "not-a-url" });
      expect(result.success).toBe(false);
    });

    it("accepts a valid DATABASE_URL", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://u:p@host:5432/db",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty CLERK_SECRET_KEY", () => {
      const result = envSchema.safeParse({ CLERK_SECRET_KEY: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("loadEnv()", () => {
    it("returns parsed env on valid input", () => {
      const env = loadEnv({ NODE_ENV: "test" });
      expect(env.NODE_ENV).toBe("test");
    });

    it("throws with a helpful message on invalid input", () => {
      expect(() => loadEnv({ DATABASE_URL: "bogus" })).toThrow(/Environment validation failed/);
      expect(() => loadEnv({ DATABASE_URL: "bogus" })).toThrow(/DATABASE_URL/);
    });

    it("references the constitution in the failure message", () => {
      expect(() => loadEnv({ NODE_ENV: "garbage" })).toThrow(/§I\.6/);
    });
  });

  describe("getEnv()", () => {
    beforeEach(() => {
      __resetEnvCache();
    });

    it("returns the same object on repeat calls (cache)", () => {
      const a = getEnv();
      const b = getEnv();
      expect(a).toBe(b);
    });
  });
});
