import { describe, expect, it } from "bun:test";
import { devClientSuffix, filePrefix } from "../../buildCache";
import { isValidFile } from "../filterFiles";

describe("isValidFile", () => {
	const uuid = "6c0f0807-f9e0-4ef0-8db9-6f624e288e60";
	it.each([
		// Valid cases
		[[filePrefix, uuid, ".apk"].join(""), true],
		[[filePrefix, uuid, devClientSuffix, ".apk"].join(""), true],

		[[filePrefix, uuid, ".app"].join(""), true],
		[[filePrefix, uuid, devClientSuffix, ".app"].join(""), true],

		// Invalid cases
		[[filePrefix, uuid, ".txt"].join(""), false],
		[[filePrefix, uuid, devClientSuffix, ".txt"].join(""), false],
		[[uuid, ".apk"].join(""), false],
	] satisfies Array<[string, boolean]>)("isValidFile %s should return %p", (file, expected) => {
		expect(isValidFile(file)).toBe(expected);
	});
});
