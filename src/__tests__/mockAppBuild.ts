import path from "node:path";
import { file } from "bun";
import env from "env-paths";

export const mockAppBuild = async (fingerprintHash: string) => {
	const tmpDir = env("expo-build-disk-cache", { suffix: "tests" }).temp;
	const appFile = file(path.join(tmpDir, `fingerprint.${fingerprintHash}.apk`));
	await appFile.write("Placeholder for real apk file");
	if (!appFile.name) throw new Error("mockBuild failed");
	return appFile.name;
};
