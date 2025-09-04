import { describe, expect, it } from "bun:test";
import { packageName } from "../config/config.ts";
import { buildDiskCacheProvider } from "../index.ts";

describe("Public API", () => {
	describe("buildDiskCacheProvider function", () => {
		it("should exist", () => {
			expect(typeof buildDiskCacheProvider).toBe("function");
		});

		it("can be called without args", () => {
			expect(buildDiskCacheProvider()).toEqual({ plugin: packageName });
		});

		it("accept empty object", () => {
			expect(buildDiskCacheProvider({})).toEqual({ plugin: packageName });
		});

		it("accept valid args", () => {
			expect(buildDiskCacheProvider({ cacheDir: "foo" })).toEqual({
				plugin: packageName,
				options: { cacheDir: "foo" },
			});
		});
	});
});
