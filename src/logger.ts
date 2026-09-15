import { getConfig } from "./config/config";

/**
 * `debug` and `info` are reserved for cache internals and stay quiet unless debug mode is on;
 * everything else is user-facing and always prints.
 */
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
