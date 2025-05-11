import { getApiConfig } from "./apiConfig.ts";

const voidFn = () => {};

export const apiLogger: Pick<typeof console, "log" | "debug" | "info" | "warn" | "error"> = {
	log: console.log,
	debug: (...args) => (getApiConfig().debug ? console.debug(...args) : voidFn),
	info: (...args) => (getApiConfig().debug ? console.info(...args) : voidFn),
	warn: console.warn,
	error: console.error,
};
