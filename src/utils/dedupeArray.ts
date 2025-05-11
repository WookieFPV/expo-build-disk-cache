export const dedupeArray = <T>(arr: Array<T>): Array<T> => {
	return [...new Set(arr)];
};
