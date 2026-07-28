import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { getConfig } from "../config";

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

	it("parses boolean-like and number-like appConfig values", () => {
		const config = getConfig({
			enable: "no",
			debug: 1,
			cacheGcTimeDays: "0",
		});

		expect(config.enable).toBe(false);
		expect(config.debug).toBe(true);
		expect(config.cacheGcTimeDays).toBe(0);
	});

	it("prefers appConfig over environment variables", () => {
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

	it("merges appConfig and config-file-style remoteOptions input", () => {
		const config = getConfig({
			remoteOptions: {
				appValue: true,
				sharedValue: "from-app-config",
			},
		});

		expect(config.remoteOptions).toEqual({
			appValue: true,
			sharedValue: "from-app-config",
		});
	});

	it("uses DISK_CACHE_REMOTE_OPTIONS over direct remoteOptions input", () => {
		process.env.DISK_CACHE_REMOTE_OPTIONS = JSON.stringify({
			envValue: 123,
			sharedValue: "from-env",
		});

		const config = getConfig({
			remoteOptions: {
				appValue: true,
				sharedValue: "from-app-config",
			},
		});

		expect(config.remoteOptions).toEqual({
			envValue: 123,
			sharedValue: "from-env",
		});
	});

	it("falls back to default config when DISK_CACHE_REMOTE_OPTIONS is invalid JSON", () => {
		process.env.DISK_CACHE_REMOTE_OPTIONS = "{invalid:json}";

		const config = getConfig({
			cacheDir: "/custom/path",
			enable: false,
			debug: true,
			cacheGcTimeDays: 42,
			remoteOptions: {
				appValue: true,
			},
		});

		expect(config).toMatchObject({
			enable: true,
			debug: false,
			cacheGcTimeDays: 7,
		});
		expect(config.cacheDir).not.toBe("/custom/path");
		expect(config.remoteOptions).toBeUndefined();
	});

	it("falls back to default config when DISK_CACHE_REMOTE_OPTIONS is not an object", () => {
		process.env.DISK_CACHE_REMOTE_OPTIONS = "[]";

		const config = getConfig({
			enable: false,
			remoteOptions: {
				appValue: true,
			},
		});

		expect(config.enable).toBe(true);
		expect(config.remoteOptions).toBeUndefined();
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

		const config = getConfig();

		// Should fall back to defaults for invalid values
		expect(config.enable).toBe(true);
		expect(config.cacheGcTimeDays).toBe(7);
	});
});
