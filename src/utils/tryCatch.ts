// Types for the result object with discriminated union
type Success<T> = {
	data: T;
	error: null;
};

type Failure<E> = {
	data: null;
	error: E;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Little try catch alternative.
 *
 * More Info & source: https://www.youtube.com/watch?v=Y6jT-IkV0VM
 * code from: https://gist.github.com/t3dotgg/a486c4ae66d32bf17c09c73609dacc5b
 *
 * @example
 * const { data, error } = await tryCatch(getLocationAsync());
 */
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
	try {
		const data = await promise;
		return { data, error: null };
	} catch (error) {
		return { data: null, error: error as E };
	}
}
