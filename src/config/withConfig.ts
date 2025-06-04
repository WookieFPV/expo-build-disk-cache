/**
 * Calls the baseFunction with the validated config object.
 * Already handles the "enable" flag
 */
export const withConfig =
	<FromType, ToType extends Record<string, unknown>, T>(
		baseFunction: (args: T, config: ToType) => Promise<string | null>,
		getConfig: (input: FromType) => ToType,
	) =>
	(args: T, config: FromType) => {
		const appConfig = getConfig(config);
		if ("enable" in appConfig && appConfig["enable"] === false) return Promise.resolve(null);
		return baseFunction(args, appConfig);
	};
