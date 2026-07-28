import { afterEach, describe, expect, it } from "bun:test";
import { parseBooleanLike, parseJsonLike, parseNumberLike, readEnvValue } from "../configHelper";

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
			const result = parseNumberLike("3", 7);
			expect(result).toBe(3);
		});

		it("should use default value when input is undefined", () => {
			const result = parseNumberLike(undefined, 7);
			expect(result).toBe(7);
		});

		it("should return the default value when input is invalid", () => {
			const result = parseNumberLike("not_a_number", 7);
			expect(result).toBe(7);
		});
	});

	describe("parseBooleanLike", () => {
		it("should parse truthy string values", () => {
			const result = parseBooleanLike("yes", false);
			expect(result).toBe(true);
		});

		it("should parse falsy string values", () => {
			const result = parseBooleanLike("false", true);
			expect(result).toBe(false);
		});

		it("should parse number values", () => {
			expect(parseBooleanLike(1, false)).toBe(true);
			expect(parseBooleanLike(0, true)).toBe(false);
		});

		it("should return the default value when input is invalid", () => {
			const result = parseBooleanLike("not-a-boolean", true);
			expect(result).toBe(true);
		});
	});

	describe("parseJsonLike", () => {
		it("should parse JSON strings", () => {
			const result = parseJsonLike(JSON.stringify({ foo: 42 }), undefined);
			expect(result).toEqual({ foo: 42 });
		});

		it("should return object input", () => {
			const result = parseJsonLike({ foo: 101 }, undefined);
			expect(result).toEqual({ foo: 101 });
		});

		it("should return the default value when JSON is invalid", () => {
			const result = parseJsonLike("{invalid:json}", { fallback: true });
			expect(result).toEqual({ fallback: true });
		});

		it("should return the default value when JSON is not an object", () => {
			const result = parseJsonLike("42", { fallback: true });
			expect(result).toEqual({ fallback: true });
		});
	});
});
