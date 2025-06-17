import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import {
	booleanLikeSchema,
	createEnvAwareSchema,
	jsonLikeSchema,
	numberLikeSchema,
} from "../configHelper";

describe("createEnvAwareSchema", () => {
	const ENV_NAME = "TEST_ENV_VAR";

	afterEach(() => {
		delete process.env[ENV_NAME];
	});

	describe("numberLikeSchema", () => {
		it("should use direct input when env var is not set", () => {
			const schema = createEnvAwareSchema(numberLikeSchema, ENV_NAME);
			const result = schema.parse(42);
			expect(result).toBe(42);
		});

		it("should prioritize env var over direct input when both are provided", () => {
			process.env[ENV_NAME] = "123";
			const schema = createEnvAwareSchema(numberLikeSchema, ENV_NAME);
			const result = schema.parse(42);
			expect(result).toBe(123);
		});

		it("should ignore empty string env vars and use direct input", () => {
			process.env[ENV_NAME] = "";
			const schema = createEnvAwareSchema(numberLikeSchema, ENV_NAME);
			const result = schema.parse("3");
			expect(result).toBe(3);
		});

		it("should throw when env var contains invalid number", () => {
			process.env[ENV_NAME] = "not_a_number";
			const schema = createEnvAwareSchema(numberLikeSchema, ENV_NAME);
			expect(() => schema.parse("ignored")).toThrow();
		});
	});

	describe("default values", () => {
		it("should use default value when env var is not set and input is undefined", () => {
			const schema = createEnvAwareSchema(z.string().default("default"), ENV_NAME);
			const result = schema.parse(undefined);
			expect(result).toBe("default");
		});

		it("should prioritize env var over default value", () => {
			process.env[ENV_NAME] = "env_value";
			const schema = createEnvAwareSchema(z.string().default("default"), ENV_NAME);
			const result = schema.parse(undefined);
			expect(result).toBe("env_value");
		});
	});

	describe("booleanLikeSchema", () => {
		it("should parse truthy string values from env var", () => {
			process.env[ENV_NAME] = "yes";
			const schema = createEnvAwareSchema(booleanLikeSchema, ENV_NAME);
			const result = schema.parse(undefined);
			expect(result).toBe(true);
		});

		it("should parse falsy string values from env var", () => {
			process.env[ENV_NAME] = "false";
			const schema = createEnvAwareSchema(booleanLikeSchema, ENV_NAME);
			const result = schema.parse("true");
			expect(result).toBe(false);
		});

		it("should parse truthy string values from direct input", () => {
			const schema = createEnvAwareSchema(booleanLikeSchema, ENV_NAME);
			const result = schema.parse("yes");
			expect(result).toBe(true);
		});

		it("should parse falsy string values from direct input", () => {
			const schema = createEnvAwareSchema(booleanLikeSchema, ENV_NAME);
			const result = schema.parse("no");
			expect(result).toBe(false);
		});
	});

	describe("jsonLikeSchema", () => {
		it("should parse JSON string from env var", () => {
			process.env[ENV_NAME] = JSON.stringify({ foo: 42 });
			const schema = createEnvAwareSchema(jsonLikeSchema, ENV_NAME);
			const result = schema.parse(undefined);
			expect(result).toEqual({ foo: 42 });
		});

		it("should prioritize env var JSON over direct input", () => {
			process.env[ENV_NAME] = JSON.stringify({ foo: 42 });
			const schema = createEnvAwareSchema(jsonLikeSchema, ENV_NAME);
			const result = schema.parse({ foo: 404 });
			expect(result).toEqual({ foo: 42 });
		});

		it("should use direct input object when env var is not set", () => {
			const schema = createEnvAwareSchema(jsonLikeSchema, ENV_NAME);
			const result = schema.parse({ foo: 101 });
			expect(result).toEqual({ foo: 101 });
		});

		it("should throw when env var contains invalid JSON", () => {
			process.env[ENV_NAME] = "{invalid:json}";
			const schema = createEnvAwareSchema(jsonLikeSchema, ENV_NAME);
			expect(() => schema.parse(undefined)).toThrow();
		});
	});

	describe("error handling", () => {
		it("should fail validation with safeParse when env var is invalid", () => {
			process.env[ENV_NAME] = "not_a_number";
			const schema = createEnvAwareSchema(numberLikeSchema, ENV_NAME);
			const result = schema.safeParse("ignored");
			expect(result.success).toBe(false);
		});
	});
});
