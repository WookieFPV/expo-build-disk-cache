import { afterEach, jest, mock } from "bun:test";

export const mockLogger = {
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

afterEach(() => {
	jest.clearAllMocks();
});

mock.module("../logger.ts", () => ({
	logger: mockLogger,
}));
