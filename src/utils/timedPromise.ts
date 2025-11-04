import { performance } from "node:perf_hooks";

type TimedResponse<T> = [result: T, duration: number];

export async function timedPromise<T>(promise: PromiseLike<T>): Promise<TimedResponse<T>> {
	const startTime = performance.now();

	const result = await promise;
	const duration = Math.round(performance.now() - startTime);

	return [result, duration];
}
