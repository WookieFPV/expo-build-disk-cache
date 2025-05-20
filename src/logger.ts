import { getConfig } from "./config/config";

const voidFn = () => {};

export const logger: Pick<typeof console, "log" | "debug" | "info" | "warn" | "error"> = {
	log: console.log,
	debug: (...args) => (getConfig().debug ? console.debug(...args) : voidFn),
	info: (...args) => (getConfig().debug ? console.info(...args) : voidFn),
	warn: console.warn,
	error: console.error,
};
