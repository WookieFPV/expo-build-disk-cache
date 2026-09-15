import { describe, expect, it } from "bun:test";
import { formatBytes } from "../formatBytes.ts";

describe("formatBytes", () => {
	it.each([
		[0, "0 Bytes"],
		[512, "512 Bytes"],
		[1024, "1 KB"],
		[1536, "1.5 KB"],
		[1024 ** 2, "1 MB"],
		[1024 ** 3 * 2.5, "2.5 GB"],
		// Beyond the largest known unit: clamped instead of producing "undefined".
		[1024 ** 9, "1024 YB"],
		// Non-sizes must not turn into "NaN undefined".
		[Number.NaN, "0 Bytes"],
		[-1, "0 Bytes"],
		[Number.POSITIVE_INFINITY, "0 Bytes"],
	] satisfies Array<[number, string]>)("formats %p as %p", (bytes, expected) => {
		expect(formatBytes(bytes)).toBe(expected);
	});

	it("honours the decimals argument", () => {
		expect(formatBytes(1536, 0)).toBe("2 KB");
		expect(formatBytes(1234567, 1)).toBe("1.2 MB");
	});

	it("treats a negative decimals argument as zero", () => {
		expect(formatBytes(1536, -3)).toBe("2 KB");
	});
});
