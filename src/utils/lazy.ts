/**
 * Lazy evaluation utility
 * source: https://twitter.com/colinhacks/status/1865002498332795032
 *
 * @example
 * const myValue = Lazy(() => "hello world");
 * myValue.value; // computes value, overwrites getter
 * myValue.value; // returns cached value
 * myValue.value; // returns cached value
 */
export function Lazy<T>(getter: () => T): { value: T } {
	return {
		get value() {
			const value = getter();
			Object.defineProperty(this, "value", { value });
			return value;
		},
	};
}
