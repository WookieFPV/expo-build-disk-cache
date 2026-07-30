import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mockLogger } from "../../__tests__/test-setup.ts";
import { getConfig } from "../config";
import type { BooleanLike, NumberLike } from "../configHelper.ts";

/** Config files are untyped at runtime, so tests need to smuggle invalid values past ConfigInput. */
const invalid = <T>(value: unknown) => value as T;

describe("getConfig", () => {
	// Store original environment and create a mock for console.debug
	const ORIGINAL_ENV = { ...process.env };

	beforeEach(() => {
		// Reset environment variables before each test
		process.env = { ...ORIGINAL_ENV };

		// Clear any environment variables that might affect tests
		for (const key of Object.keys(process.env).filter((k) => k.startsWith("DISK_CACHE_"))) {
			delete process.env[key];
		}

		getConfig({}); // Reset config cache
	});

	afterEach(() => {
		// Restore original environment and console.debug
		process.env = { ...ORIGINAL_ENV };
	});

	it("returns default config when no input is provided", () => {
		const config = getConfig();

		expect(config).toMatchObject({
			enable: true,
			debug: false,
			cacheGcTimeDays: 7,
		});
		expect(typeof config.cacheDir).toBe("string");
		expect(config.cacheDir).not.toBe("");
	});

	it("overrides config with appConfig", () => {
		const customConfig = {
			enable: false,
			debug: false,
			cacheGcTimeDays: 42,
			cacheDir: "/custom/path",
		};

		const config = getConfig(customConfig);

		expect(config).toMatchObject(customConfig);
	});

	it("overrides config with environment variables", () => {
		// Set environment variables
		process.env.DISK_CACHE_ENABLE = "true";
		process.env.DISK_CACHE_DEBUG = "false";
		process.env.DISK_CACHE_GC_TIME_DAYS = "99";
		process.env.DISK_CACHE_CACHE_DIR = "/foo/bar/cache";

		const config = getConfig({});

		expect(config.enable).toEqual(true);
		expect(config.debug).toEqual(false);
		expect(config.cacheGcTimeDays).toEqual(99);
		expect(config.cacheDir).toEqual("/foo/bar/cache");
	});

	it("prefers environment variables over appConfig", () => {
		// Set environment variables
		process.env.DISK_CACHE_ENABLE = "false";
		process.env.DISK_CACHE_DEBUG = "false";

		// Set conflicting appConfig
		const config = getConfig({
			enable: true,
			debug: true,
		});

		expect(config.enable).toEqual(false);
		expect(config.debug).toEqual(false);
	});

	it("returns cached config if called again without appConfig", () => {
		const config1 = getConfig({ enable: true });
		const config2 = getConfig();

		expect(config2).toBe(config1); // Same object reference
		expect(config2.enable).toBe(true);
	});

	it("returns new config if called with new appConfig", () => {
		const config1 = getConfig({ enable: true });
		const config2 = getConfig({ enable: false });

		expect(config2).not.toBe(config1); // Different object reference
		expect(config1.enable).toBe(true);
		expect(config2.enable).toBe(false);
	});

	it("handles invalid environment variable values gracefully", () => {
		process.env.DISK_CACHE_ENABLE = "not-a-boolean";
		process.env.DISK_CACHE_GC_TIME_DAYS = "not-a-number";

		// must pass an appConfig: getConfig() alone returns the config cached in beforeEach
		const config = getConfig({});

		// Should fall back to defaults for invalid values
		expect(config.enable).toBe(true);
		expect(config.cacheGcTimeDays).toBe(7);
	});

	it("warns about invalid values and names the env variable they came from", () => {
		process.env.DISK_CACHE_GC_TIME_DAYS = "not-a-number";

		getConfig({});

		const warnings = mockLogger.warn.mock.calls.flat().join("\n");
		expect(warnings).toContain("cacheGcTimeDays");
		expect(warnings).toContain("not-a-number");
		expect(warnings).toContain("$DISK_CACHE_GC_TIME_DAYS");
		expect(warnings).toContain("using default: 7");
	});

	it("names appConfig as the source when no env variable is set", () => {
		getConfig({ cacheGcTimeDays: "still-not-a-number" });

		expect(mockLogger.warn.mock.calls.flat().join("\n")).toContain("cacheGcTimeDays in appConfig");
	});

	it("does not repeat the same warnings on every call", () => {
		// getConfig runs on every resolve/upload call and cannot use its cache when given options
		process.env.DISK_CACHE_GC_TIME_DAYS = "not-a-number-either";

		getConfig({});
		const warnCount = mockLogger.warn.mock.calls.length;
		getConfig({});

		expect(warnCount).toBeGreaterThan(0);
		expect(mockLogger.warn.mock.calls.length).toBe(warnCount);
	});

	it("keeps the remaining config when a single value is invalid", () => {
		// `enable:` without a value in a YAML config file parses to null
		const config = getConfig({
			enable: invalid<BooleanLike>(null),
			debug: true,
			cacheGcTimeDays: 42,
		});

		expect(config.enable).toBe(true); // default
		expect(config.debug).toBe(true);
		expect(config.cacheGcTimeDays).toBe(42);
	});

	it("does not throw on non-primitive values in the config", () => {
		const config = getConfig({
			enable: invalid<BooleanLike>({}),
			cacheGcTimeDays: invalid<NumberLike>([]),
			cacheDir: invalid<string>(123),
			remotePlugin: invalid<string>(42),
		});

		expect(config.enable).toBe(true);
		expect(config.cacheGcTimeDays).toBe(7);
		expect(typeof config.cacheDir).toBe("string");
		expect(config.remotePlugin).toBeUndefined();
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it("omits optional keys instead of setting them to undefined", () => {
		const config = getConfig({});

		expect("remotePlugin" in config).toBe(false);
		expect(Object.keys(config)).not.toContain("remotePlugin");
	});

	it("sets remotePlugin and remoteOptions when configured", () => {
		const config = getConfig({ remotePlugin: "eas", remoteOptions: { foo: 1 } });

		expect(config.remotePlugin).toBe("eas");
		expect(config.remoteOptions).toEqual({ foo: 1 });
	});

	it("parses remoteOptions from a JSON env var", () => {
		process.env.DISK_CACHE_REMOTE_OPTIONS = JSON.stringify({ bucket: "my-bucket" });

		const config = getConfig({ remotePlugin: "custom" });

		expect(config.remoteOptions).toEqual({ bucket: "my-bucket" });
	});

	it("falls back to the merged options when the JSON env var is invalid", () => {
		process.env.DISK_CACHE_REMOTE_OPTIONS = "{not json}";

		const config = getConfig({ remotePlugin: "custom", remoteOptions: { foo: 1 } });

		expect(config.remoteOptions).toBeUndefined();
		expect(mockLogger.warn.mock.calls.flat().join("\n")).toContain("remoteOptions");
	});

	it("accepts on/off for boolean values", () => {
		process.env.DISK_CACHE_ENABLE = "off";
		expect(getConfig({}).enable).toBe(false);

		process.env.DISK_CACHE_ENABLE = "on";
		expect(getConfig({}).enable).toBe(true);
	});

	it("resolves cacheDir relative to the home directory for ~ paths", () => {
		const config = getConfig({ cacheDir: "~/my-cache" });

		expect(config.cacheDir).not.toContain("~");
		expect(config.cacheDir.endsWith("my-cache")).toBe(true);
	});

	it("coerces number-like strings", () => {
		expect(getConfig({ cacheGcTimeDays: "30" }).cacheGcTimeDays).toBe(30);
		expect(getConfig({ cacheGcTimeDays: "-1" }).cacheGcTimeDays).toBe(-1);
	});
});
