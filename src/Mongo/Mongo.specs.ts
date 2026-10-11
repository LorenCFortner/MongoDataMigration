import "reflect-metadata";
import {container} from "tsyringe";
import {MongoClient} from "mongodb";
import {Mongo} from "./Mongo";

let mockConnect: jest.Mock;
let mockClose: jest.Mock;
let mockDb: jest.Mock;
let mockStartSession: jest.Mock;
let mockAdminCommand: jest.Mock;
let mockAdminDb: jest.Mock;

jest.mock("mongodb", () => ({
	MongoClient: jest.fn(),
}));

describe("Mongo", () => {
	let mongo: Mongo;
	const mockMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

	let originalMongoDb: string | undefined;
	let originalMongoUri: string | undefined;

	beforeAll(() => {
		originalMongoDb = process.env.MONGO_DB;
		originalMongoUri = process.env.MONGO_URI;
	});

	afterAll(() => {
		if (originalMongoDb === undefined) {
			delete process.env.MONGO_DB;
		} else {
			process.env.MONGO_DB = originalMongoDb;
		}

		if (originalMongoUri === undefined) {
			delete process.env.MONGO_URI;
		} else {
			process.env.MONGO_URI = originalMongoUri;
		}
	});

	beforeEach(() => {
		process.env.MONGO_DB = "TestMigrateMongo";
		delete process.env.MONGO_URI;

		mockConnect = jest.fn();
		mockClose = jest.fn();
		mockStartSession = jest.fn();
		mockAdminCommand = jest.fn().mockResolvedValue({setName: "rs0"});
		mockAdminDb = jest.fn().mockReturnValue({command: mockAdminCommand});

		mockDb = jest.fn().mockImplementation((name: string) => (name === "admin" ? mockAdminDb() : {}));

		container.reset();

		mockMongoClient.mockImplementation(
			() =>
				({
					connect: mockConnect,
					close: mockClose,
					db: mockDb,
					startSession: mockStartSession,
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

	describe("constructor should", () => {
		it("throw if MONGO_DB is not set", () => {
			delete process.env.MONGO_DB;

			expect(() => container.resolve(Mongo)).toThrow("MONGO_DB environment variable is not set");
		});

		it("throw if MONGO_DB is set to an empty string", () => {
			process.env.MONGO_DB = "";

			expect(() => container.resolve(Mongo)).toThrow("MONGO_DB environment variable is not set");
		});

		it("not silently fall back to a default database name", () => {
			delete process.env.MONGO_DB;

			try {
				container.resolve(Mongo);

				throw new Error("expected container.resolve(Mongo) to throw");
			} catch (error) {
				expect(error instanceof Error ? error.message : String(error)).not.toContain("TestMigrateMongo");
			}
		});

		it("use MONGO_DB when set", () => {
			process.env.MONGO_DB = "MyRealDatabase";

			const realMongo = container.resolve(Mongo);

			expect(realMongo.databaseName).toBe("MyRealDatabase");
		});

		it("default the URI to localhost when MONGO_URI is not set", () => {
			expect(mongo.uri).toBe("mongodb://localhost:27017");
		});

		it("use MONGO_URI when set", () => {
			process.env.MONGO_URI = "mongodb://some-host:27017";

			const realMongo = container.resolve(Mongo);

			expect(realMongo.uri).toBe("mongodb://some-host:27017");
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

		it("close an existing connection before opening a new one, instead of leaking it", async () => {
			await mongo.getMongoDatabase();

			expect(mockClose).not.toHaveBeenCalled();

			await mongo.getMongoDatabase();

			expect(mockClose).toHaveBeenCalledTimes(1);

			expect(mockMongoClient).toHaveBeenCalledTimes(2);
		});

		it("close the first connection before connecting the second", async () => {
			const callOrder: string[] = [];

			mockClose.mockImplementation(() => {
				callOrder.push("close");

				return Promise.resolve();
			});

			mockConnect.mockImplementation(() => {
				callOrder.push("connect");

				return Promise.resolve();
			});

			await mongo.getMongoDatabase();

			await mongo.getMongoDatabase();

			expect(callOrder).toEqual(["connect", "close", "connect"]);
		});
	});

	describe("closeMongoDatabase should", () => {
		it("call close if client is defined", async () => {
			await mongo.getMongoDatabase();
			await mongo.closeMongoDatabase();

			expect(mockClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("startSession should", () => {
		it("throw if called before getMongoDatabase", () => {
			expect(() => mongo.startSession()).toThrow("MongoDB client is not connected");
		});

		it("delegate to the underlying client", async () => {
			const fakeSession = {};
			mockStartSession.mockReturnValue(fakeSession);

			await mongo.getMongoDatabase();

			expect(mongo.startSession()).toBe(fakeSession);
			expect(mockStartSession).toHaveBeenCalledTimes(1);
		});
	});

	describe("supportsTransactions should", () => {
		it("throw if called before getMongoDatabase", async () => {
			await expect(mongo.supportsTransactions()).rejects.toThrow("MongoDB client is not connected");
		});

		it("return true when connected to a replica set", async () => {
			mockAdminCommand.mockResolvedValue({setName: "rs0"});

			await mongo.getMongoDatabase();

			expect(await mongo.supportsTransactions()).toBe(true);
		});

		it("return true when connected to a mongos router", async () => {
			mockAdminCommand.mockResolvedValue({msg: "isdbgrid"});

			await mongo.getMongoDatabase();

			expect(await mongo.supportsTransactions()).toBe(true);
		});

		it("return false when connected to a standalone server", async () => {
			mockAdminCommand.mockResolvedValue({});

			await mongo.getMongoDatabase();

			expect(await mongo.supportsTransactions()).toBe(false);
		});

		it("fall back to isMaster when hello is not supported", async () => {
			mockAdminCommand.mockRejectedValueOnce(new Error("no such command: 'hello'")).mockResolvedValueOnce({setName: "rs0"});

			await mongo.getMongoDatabase();

			expect(await mongo.supportsTransactions()).toBe(true);
			expect(mockAdminCommand).toHaveBeenNthCalledWith(1, {hello: 1});
			expect(mockAdminCommand).toHaveBeenNthCalledWith(2, {isMaster: 1});
		});
	});
});
