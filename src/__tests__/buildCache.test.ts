import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	devClientSuffix,
	getCachedAppPath,
	hasDirectDevClientDependency,
	isDevClientBuild,
} from "../buildCache.ts";

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
	it("returns false instead of throwing when package.json is missing", async () => {
		// Every cache path computes a file name through here, so a project without a readable
		// package.json must degrade to "not a dev-client build" rather than fail the build.
		const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "expo-disk-cache-empty-"));
		try {
			expect(hasDirectDevClientDependency(projectRoot)).toBeFalse();
		} finally {
			await fs.rm(projectRoot, { recursive: true, force: true });
		}
	});

	it("returns false instead of throwing when package.json is not valid JSON", async () => {
		const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "expo-disk-cache-broken-"));
		try {
			await fs.writeFile(path.join(projectRoot, "package.json"), "{ not json");
			expect(hasDirectDevClientDependency(projectRoot)).toBeFalse();
		} finally {
			await fs.rm(projectRoot, { recursive: true, force: true });
		}
	});
});

describe("isDevClientBuild", () => {
	const withDevClient = { dependencies: { "expo-dev-client": "55.0.0" } };
	const withoutDevClient = { dependencies: { expo: "55.0.0" } };

	it("is false without a direct expo-dev-client dependency, whatever the run options say", async () => {
		await withPackageJson(withoutDevClient, (projectRoot) => {
			expect(isDevClientBuild({ projectRoot, runOptions: { variant: "debug" } })).toBeFalse();
		});
	});

	it("defaults to true when no variant or configuration is given", async () => {
		await withPackageJson(withDevClient, (projectRoot) => {
			expect(isDevClientBuild({ projectRoot, runOptions: {} })).toBeTrue();
		});
	});

	it.each([
		["debug", true],
		["release", false],
	] satisfies Array<[string, boolean]>)(
		"maps the android variant %p to %p",
		async (variant, expected) => {
			await withPackageJson(withDevClient, (projectRoot) => {
				expect(isDevClientBuild({ projectRoot, runOptions: { variant } })).toBe(expected);
			});
		},
	);

	it.each([
		["Debug", true],
		["Release", false],
	] satisfies Array<["Debug" | "Release", boolean]>)(
		"maps the ios configuration %p to %p",
		async (configuration, expected) => {
			await withPackageJson(withDevClient, (projectRoot) => {
				expect(isDevClientBuild({ projectRoot, runOptions: { configuration } })).toBe(expected);
			});
		},
	);
});

describe("getCachedAppPath", () => {
	const hash = "abc123";

	it("names android builds .apk and ios builds .app", async () => {
		await withPackageJson({ dependencies: { expo: "55.0.0" } }, (projectRoot) => {
			const base = { projectRoot, runOptions: {}, fingerprintHash: hash, cacheDir: "/tmp/cache" };

			expect(getCachedAppPath({ ...base, platform: "android" })).toBe(
				path.join("/tmp/cache", `fingerprint.${hash}.apk`),
			);
			expect(getCachedAppPath({ ...base, platform: "ios" })).toBe(
				path.join("/tmp/cache", `fingerprint.${hash}.app`),
			);
		});
	});

	it("tags dev-client builds so they never collide with release builds of the same fingerprint", async () => {
		await withPackageJson({ dependencies: { "expo-dev-client": "55.0.0" } }, (projectRoot) => {
			const base = {
				projectRoot,
				platform: "android",
				fingerprintHash: hash,
				cacheDir: "/tmp/cache",
			} as const;

			const dev = getCachedAppPath({ ...base, runOptions: { variant: "debug" } });
			const release = getCachedAppPath({ ...base, runOptions: { variant: "release" } });

			expect(dev).toInclude(devClientSuffix);
			expect(release).not.toInclude(devClientSuffix);
			expect(dev).not.toBe(release);
		});
	});

	it("resolves a relative cacheDir to an absolute path", async () => {
		await withPackageJson({ dependencies: { expo: "55.0.0" } }, (projectRoot) => {
			const result = getCachedAppPath({
				projectRoot,
				platform: "android",
				runOptions: {},
				fingerprintHash: hash,
				cacheDir: "./relative-cache",
			});

			expect(path.isAbsolute(result)).toBeTrue();
			expect(result).toBe(path.join(process.cwd(), "relative-cache", `fingerprint.${hash}.apk`));
		});
	});
});
