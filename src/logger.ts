import { getConfig } from "./config/config";

export const logger: Pick<typeof console, "log" | "debug" | "info" | "warn" | "error"> = {
	log: console.log,
	debug: (...args) => {
		if (getConfig().debug) console.debug(...args);
	},
	info: (...args) => {
		if (getConfig().debug) console.info(...args);
	},
	warn: console.warn,
	error: console.error,
};
