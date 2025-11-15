import "reflect-metadata";
import {Runner} from "./src/Runner/Runner";

describe("Minimal Runner Test", () => {
	it("should create runner instance", () => {
		const mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			startSession: jest.fn(),
			endSession: jest.fn(),
		};

		const mockMongo = {
			uri: "mongodb://localhost:27017",
			getMongoDatabase: jest.fn(),
			closeMongoDatabase: jest.fn(),
		};

		const runner = new Runner(mockLogger as any, mockMongo as any);

		expect(runner).toBeDefined();
	});
});
