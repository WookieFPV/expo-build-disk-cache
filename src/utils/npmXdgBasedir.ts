import os from "node:os";
import path from "node:path";

/**
 * Code from https://github.com/sindresorhus/xdg-basedir
 * Had to copy the code here because I want to publish cjs (to ensure compatibility with node 18)
 * The package is esm only
 */

const homeDirectory = os.homedir();
const { env } = process;

export const xdgConfig =
	env["XDG_CONFIG_HOME"] ||
	(homeDirectory ? path.join(homeDirectory, ".config") : undefined);
