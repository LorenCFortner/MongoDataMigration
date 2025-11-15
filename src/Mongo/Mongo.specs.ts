import "reflect-metadata";
import {container} from "tsyringe";
import {MongoClient} from "mongodb";
import {Mongo} from "./Mongo";

let mockConnect: jest.Mock;
let mockClose: jest.Mock;
let mockDb: jest.Mock;

jest.mock("mongodb", () => ({
	MongoClient: jest.fn(),
}));

describe("Mongo", () => {
	let mongo: Mongo;
	const mockMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

	beforeEach(() => {
		mockConnect = jest.fn();
		mockClose = jest.fn();
		mockDb = jest.fn();

		container.reset();

		mockMongoClient.mockImplementation(
			() =>
				({
					connect: mockConnect,
					close: mockClose,
					db: mockDb,
				} as any)
		);

		mongo = container.resolve(Mongo);
	});

	afterEach(() => {
		container.reset();
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe("On initial load should", () => {
		it("mongo to be defined", () => {
			expect(mongo).toBeDefined();
		});

		it("be an instance of Mongo", () => {
			expect(mongo).toBeInstanceOf(Mongo);
		});
	});

	describe("getMongoDatabase should", () => {
		it("create new MongoClient with correct URI", async () => {
			await mongo.getMongoDatabase();

			expect(mockMongoClient).toHaveBeenCalledTimes(1);
			expect(mockMongoClient).toHaveBeenCalledWith(mongo.uri);
		});

		it("call connect", async () => {
			await mongo.getMongoDatabase();

			expect(mockConnect).toHaveBeenCalledTimes(1);
		});

		it("call db with correct database name", async () => {
			await mongo.getMongoDatabase();

			expect(mockDb).toHaveBeenCalledTimes(1);

			expect(mockDb).toHaveBeenCalledWith(mongo.databaseName);
		});
	});

	describe("closeMongoDatabase should", () => {
		it("call close if client is defined", async () => {
			await mongo.getMongoDatabase();
			await mongo.closeMongoDatabase();

			expect(mockClose).toHaveBeenCalledTimes(1);
		});
	});
});
