import { describe, expect, it } from "bun:test";
import os from "node:os";
import path from "node:path";
import { configFilePaths } from "../configHelper";

describe("configFormats", () => {
	it("returns file paths with all supported extensions for a single base path", () => {
		const result = configFilePaths("config");
		expect(result).toEqual(["config.json", "config.yaml", "config.yml"]);
	});

	it("returns file paths with all supported extensions for a single base path with leading dot", () => {
		const result = configFilePaths(".config");
		expect(result).toEqual([".config.json", ".config.yaml", ".config.yml"]);
	});

	it("generates relative paths for absolute input paths", () => {
		const result = configFilePaths(os.homedir(), "config");
		expect(result).toEqual(["config.json", "config.yaml", "config.yml"]);
	});

	it("generates relative paths for absolute input paths with folder", () => {
		const result = configFilePaths(os.homedir(), "foo", "bar");
		expect(result).toEqual(["foo/bar.json", "foo/bar.yaml", "foo/bar.yml"]);
	});

	it("handles multiple path segments correctly", () => {
		const result = configFilePaths("dir", "subdir", "config");
		expect(result).toEqual([
			path.join("dir", "subdir", "config.json"),
			path.join("dir", "subdir", "config.yaml"),
			path.join("dir", "subdir", "config.yml"),
		]);
	});

	it("throws an error if no paths are provided", () => {
		const result = configFilePaths();
		expect(result).toEqual([]);
	});

	it("handles paths with special characters", () => {
		const result = configFilePaths("dir with spaces", "config");
		expect(result).toEqual([
			path.join("dir with spaces", "config.json"),
			path.join("dir with spaces", "config.yaml"),
			path.join("dir with spaces", "config.yml"),
		]);
	});
});
