import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { hasDirectDevClientDependency } from "../buildCache.ts";

async function withPackageJson(
	packageJson: Record<string, unknown>,
	test: (projectRoot: string) => void | Promise<void>,
) {
	const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "expo-disk-cache-provider-"));
	try {
		await fs.writeFile(path.join(projectRoot, "package.json"), JSON.stringify(packageJson));
		await test(projectRoot);
	} finally {
		await fs.rm(projectRoot, { recursive: true, force: true });
	}
}

describe("hasDirectDevClientDependency", () => {
	it("detects expo-dev-client in dependencies", async () => {
		await withPackageJson({ dependencies: { "expo-dev-client": "55.0.0" } }, (projectRoot) => {
			expect(hasDirectDevClientDependency(projectRoot)).toBeTrue();
		});
	});

	it("detects expo-dev-client in devDependencies", async () => {
		await withPackageJson({ devDependencies: { "expo-dev-client": "55.0.0" } }, (projectRoot) => {
			expect(hasDirectDevClientDependency(projectRoot)).toBeTrue();
		});
	});

	it("returns false when expo-dev-client is not a direct dependency", async () => {
		await withPackageJson({ dependencies: { expo: "55.0.0" } }, (projectRoot) => {
			expect(hasDirectDevClientDependency(projectRoot)).toBeFalse();
		});
	});
});
