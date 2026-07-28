import { afterEach, describe, expect, it } from "bun:test";
import {
	type ConfigIssues,
	parseBooleanLike,
	parseJsonLike,
	parseNumberLike,
	parseStringLike,
	readEnvValue,
} from "../configHelper";

describe("config parsing helpers", () => {
	const ENV_NAME = "TEST_ENV_VAR";

	afterEach(() => {
		delete process.env[ENV_NAME];
	});

	describe("readEnvValue", () => {
		it("should use direct input when env var is not set", () => {
			const result = readEnvValue(42, ENV_NAME);
			expect(result).toBe(42);
		});

		it("should prioritize env var over direct input when both are provided", () => {
			process.env[ENV_NAME] = "123";
			const result = readEnvValue(42, ENV_NAME);
			expect(result).toBe("123");
		});

		it("should ignore empty string env vars and use direct input", () => {
			process.env[ENV_NAME] = "";
			const result = readEnvValue("3", ENV_NAME);
			expect(result).toBe("3");
		});
	});

	describe("parseNumberLike", () => {
		it("should parse direct number-like input", () => {
			expect(parseNumberLike("3", "gc", 7)).toBe(3);
			expect(parseNumberLike(3, "gc", 7)).toBe(3);
			expect(parseNumberLike("1e3", "gc", 7)).toBe(1000);
			expect(parseNumberLike("-1", "gc", 7)).toBe(-1);
		});

		it("should use default value when input is undefined or null", () => {
			expect(parseNumberLike(undefined, "gc", 7)).toBe(7);
			expect(parseNumberLike(null, "gc", 7)).toBe(7);
		});

		it("should return the default value when input is invalid", () => {
			expect(parseNumberLike("not_a_number", "gc", 7)).toBe(7);
			expect(parseNumberLike(Number.NaN, "gc", 7)).toBe(7);
		});

		it("should reject non-finite values instead of disabling cache cleanup", () => {
			expect(parseNumberLike("Infinity", "gc", 7)).toBe(7);
			expect(parseNumberLike(Number.POSITIVE_INFINITY, "gc", 7)).toBe(7);
		});

		it("should reject empty strings and non-primitives rather than coercing them to 0", () => {
			expect(parseNumberLike("", "gc", 7)).toBe(7);
			expect(parseNumberLike("   ", "gc", 7)).toBe(7);
			expect(parseNumberLike([], "gc", 7)).toBe(7);
			expect(parseNumberLike({}, "gc", 7)).toBe(7);
		});

		it("should collect an issue naming the field and the fallback", () => {
			const issues: ConfigIssues = [];
			parseNumberLike("nope", "cacheGcTimeDays", 7, issues);
			expect(issues).toHaveLength(1);
			expect(issues[0]).toContain("cacheGcTimeDays");
			expect(issues[0]).toContain("nope");
			expect(issues[0]).toContain("7");
		});

		it("should not collect an issue for valid input", () => {
			const issues: ConfigIssues = [];
			parseNumberLike("30", "cacheGcTimeDays", 7, issues);
			expect(issues).toEqual([]);
		});
	});

	describe("parseBooleanLike", () => {
		it("should parse truthy string values", () => {
			for (const value of ["true", "TRUE", "1", "yes", "on", " true "]) {
				expect(parseBooleanLike(value, "enable", false)).toBe(true);
			}
		});

		it("should parse falsy string values", () => {
			for (const value of ["false", "FALSE", "0", "no", "off", " false "]) {
				expect(parseBooleanLike(value, "enable", true)).toBe(false);
			}
		});

		it("should parse boolean and number values", () => {
			expect(parseBooleanLike(true, "enable", false)).toBe(true);
			expect(parseBooleanLike(false, "enable", true)).toBe(false);
			expect(parseBooleanLike(1, "enable", false)).toBe(true);
			expect(parseBooleanLike(0, "enable", true)).toBe(false);
		});

		it("should use the default value when input is undefined or null", () => {
			expect(parseBooleanLike(undefined, "enable", true)).toBe(true);
			// `enable:` without a value in YAML parses to null - must not throw
			expect(parseBooleanLike(null, "enable", true)).toBe(true);
			expect(parseBooleanLike(null, "debug", false)).toBe(false);
		});

		it("should return the default value when input is invalid", () => {
			expect(parseBooleanLike("not-a-boolean", "enable", true)).toBe(true);
			expect(parseBooleanLike("", "enable", true)).toBe(true);
			expect(parseBooleanLike(Number.NaN, "enable", true)).toBe(true);
		});

		it("should not throw on non-primitive values", () => {
			expect(() => parseBooleanLike({}, "enable", true)).not.toThrow();
			expect(parseBooleanLike({}, "enable", true)).toBe(true);
			expect(parseBooleanLike([], "enable", false)).toBe(false);
		});

		it("should collect an issue for invalid input only", () => {
			const issues: ConfigIssues = [];
			expect(parseBooleanLike("maybe", "enable", true, issues)).toBe(true);
			expect(issues).toHaveLength(1);
			expect(issues[0]).toContain("enable");
			expect(issues[0]).toContain("maybe");

			parseBooleanLike("yes", "enable", true, issues);
			expect(issues).toHaveLength(1);
		});
	});

	describe("parseStringLike", () => {
		it("should return string input unchanged", () => {
			expect(parseStringLike("/tmp/cache", "cacheDir", "/default")).toBe("/tmp/cache");
		});

		it("should use the default value for undefined and null", () => {
			expect(parseStringLike(undefined, "cacheDir", "/default")).toBe("/default");
			expect(parseStringLike(null, "cacheDir", "/default")).toBe("/default");
			expect(parseStringLike(undefined, "remotePlugin", undefined)).toBeUndefined();
		});

		it("should reject non-strings and blank strings with an issue", () => {
			const issues: ConfigIssues = [];
			expect(parseStringLike(123, "remotePlugin", undefined, issues)).toBeUndefined();
			expect(parseStringLike("", "cacheDir", "/default", issues)).toBe("/default");
			expect(parseStringLike("  ", "cacheDir", "/default", issues)).toBe("/default");
			expect(issues).toHaveLength(3);
			expect(issues[0]).toContain("remotePlugin");
		});
	});

	describe("parseJsonLike", () => {
		it("should parse JSON strings", () => {
			const result = parseJsonLike(JSON.stringify({ foo: 42 }), "remoteOptions");
			expect(result).toEqual({ foo: 42 });
		});

		it("should return object input", () => {
			const result = parseJsonLike({ foo: 101 }, "remoteOptions");
			expect(result).toEqual({ foo: 101 });
		});

		it("should use the default value for undefined and null", () => {
			expect(parseJsonLike(undefined, "remoteOptions", { fallback: true })).toEqual({
				fallback: true,
			});
			expect(parseJsonLike(null, "remoteOptions", { fallback: true })).toEqual({ fallback: true });
		});

		it("should return the default value when JSON is invalid", () => {
			const issues: ConfigIssues = [];
			const result = parseJsonLike("{invalid:json}", "remoteOptions", { fallback: true }, issues);
			expect(result).toEqual({ fallback: true });
			expect(issues).toHaveLength(1);
			expect(issues[0]).toContain("remoteOptions");
		});

		it("should reject non-objects in both the string and the value branch", () => {
			expect(parseJsonLike("42", "remoteOptions", { fallback: true })).toEqual({ fallback: true });
			expect(parseJsonLike("[1,2]", "remoteOptions", { fallback: true })).toEqual({
				fallback: true,
			});
			// the object branch used to trust its declared type and pass arrays straight through
			expect(parseJsonLike([1, 2], "remoteOptions", { fallback: true })).toEqual({
				fallback: true,
			});
			expect(parseJsonLike(42, "remoteOptions", undefined)).toBeUndefined();
		});
	});
});
