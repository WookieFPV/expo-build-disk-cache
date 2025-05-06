import { getConfig } from "./config/config";

const voidFn = () => {};

const noLogger = {
	log: console.log,
	debug: voidFn,
	info: voidFn,
	warn: console.warn,
	error: console.error,
} as typeof console;

export const logger = getConfig({}).debug ? console : noLogger;
