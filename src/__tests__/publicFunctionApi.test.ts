import { describe, expect, it } from "bun:test";
import { packageName } from "../config/config.ts";
import { buildDiskCacheProvider } from "../index.ts";

describe("Public Function API", () => {
	describe("buildDiskCacheProvider function", () => {
		it("should exist", () => {
			expect(typeof buildDiskCacheProvider).toBe("function");
		});

		it("can be called without args", () => {
			expect(buildDiskCacheProvider()).toEqual({ plugin: packageName });
		});

		// An explicitly passed `{}` is forwarded as-is rather than dropped: `options` is part of
		// the shipped return shape, and omitting it for one particular input would make the
		// result type depend on the argument's contents.
		it("accept empty object", () => {
			expect(buildDiskCacheProvider({})).toEqual({ plugin: packageName, options: {} });
		});

		it("accept valid args", () => {
			expect(buildDiskCacheProvider({ cacheDir: "foo" })).toEqual({
				plugin: packageName,
				options: { cacheDir: "foo" },
			});
		});
	});
});
