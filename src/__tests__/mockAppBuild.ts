import path from "node:path";
import { file } from "bun";
import env from "env-paths";
import { packageName } from "../config/config.ts";

const tmpDir = env(packageName, { suffix: "tests" }).temp;

export const mockAppBuild = async (fingerprintHash: string) => {
	const appFile = file(path.join(tmpDir, `fingerprint.${fingerprintHash}.apk`));
	await appFile.write("Placeholder for real apk file");
	if (!appFile.name) throw new Error("mockBuild failed");
	return appFile.name;
};

/**
 * Create a Dummy .apk of the specified size in MB (without real content)
 */
export const mockAppBuildWithSize = async (fingerprintHash: string, sizeMb: number) => {
	const appFile = file(path.join(tmpDir, `fingerprint.${fingerprintHash}.apk`));

	await appFile.write(Buffer.alloc(Math.round(sizeMb * 1024 * 1024)));
	if (!appFile.name) throw new Error("mockBuild failed");
	return appFile.name;
};
