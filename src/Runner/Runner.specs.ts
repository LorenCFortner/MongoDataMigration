import "reflect-metadata";
import {container} from "tsyringe";
import {Runner} from "./Runner";
import {ILogger} from "../Logger/Logger";
import {IMongo} from "../Mongo/Mongo";

jest.mock("../../MigrationRegistryAuto", () => ({
	migrationRegistry: [
		{id: 1, name: "1-migration", up: jest.fn()},
		{id: 2, name: "2-migration", up: jest.fn()},
		{id: 13, name: "13-migration", up: jest.fn()},
	],
	migrationCount: 3,
}));

describe("Runner", () => {
	let runner: Runner;
	let logger: jest.Mocked<ILogger>;
	let mongo: jest.Mocked<IMongo>;

	let mockFindOne: jest.Mock;
	let mockReplaceOne: jest.Mock;
	let mockCollection: any;
	let mockDb: any;

	const createMigrationRegistryMock = () => [
		{id: 1, name: "1-migration", up: jest.fn()},
		{id: 2, name: "2-migration", up: jest.fn()},
		{id: 13, name: "13-migration", up: jest.fn()},
	];

	const setupMongoMocks = (findOneReturnValue: any = null) => {
		mockFindOne = jest.fn().mockResolvedValue(findOneReturnValue);
		mockReplaceOne = jest.fn();
		mockCollection = {
			findOne: mockFindOne,
			replaceOne: mockReplaceOne,
		};
		mockDb = {
			collection: jest.fn().mockReturnValue(mockCollection),
		};
		mongo.getMongoDatabase.mockResolvedValue(mockDb as any);
	};

	const mockLastMigrationId = (migrationId: number | null) => {
		const returnValue = migrationId === null ? null : {migrationId};
		mockFindOne.mockResolvedValue(returnValue);
	};

	beforeEach(() => {
		logger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			startSession: jest.fn(),
			endSession: jest.fn(),
		} as jest.Mocked<ILogger>;

		mongo = {
			uri: "mongodb://localhost:27017",
			getMongoDatabase: jest.fn(),
			closeMongoDatabase: jest.fn().mockResolvedValue(undefined),
		} as jest.Mocked<IMongo>;

		container.reset();

		container.register("ILogger", {useValue: logger});
		container.register("IMongo", {useValue: mongo});

		runner = container.resolve(Runner);

		setupMongoMocks();
	});

	afterEach(() => {
		container.reset();
		jest.clearAllMocks();
		jest.restoreAllMocks();

		const mockMigrationRegistry = require("../../MigrationRegistryAuto");
		mockMigrationRegistry.migrationRegistry = createMigrationRegistryMock();
	});

	describe("execute should", () => {
		it("be defined", () => {
			expect(runner.execute).toBeDefined();
		});

		it("calls mongo.getMongoDatabase and runs migrations", async () => {
			await runner.execute();

			expect(mongo.getMongoDatabase).toHaveBeenCalled();

			expect(mockDb.collection).toHaveBeenCalledWith("_migrations");

			expect(mockFindOne).toHaveBeenCalled();

			expect(mongo.closeMongoDatabase).toHaveBeenCalled();
		});

		it("sets appliedCollection to the _migrations collection", async () => {
			const originalTeardown = (runner as any).teardownMongo;
			const teardownSpy = jest.spyOn(runner as any, "teardownMongo").mockImplementation(async () => {
				expect(runner.appliedCollection).toBeDefined();

				expect(runner.appliedCollection).toBe(mockCollection);

				expect(mockDb.collection).toHaveBeenCalledWith("_migrations");

				await originalTeardown.call(runner);
			});

			try {
				await runner.execute();
				expect(teardownSpy).toHaveBeenCalledTimes(1);
			} finally {
				teardownSpy.mockRestore();
			}
		});

		it("calls appliedCollection.findOne when runMigrations is implemented", async () => {
			await runner.execute();

			expect(mockFindOne).toHaveBeenCalledTimes(1);
		});

		it("logs migration ID as zero when no migrations have been applied", async () => {
			await runner.execute();

			expect(logger.log).toHaveBeenCalledWith("Last applied migration ID: 0");
		});

		it("logs migration ID when migrations have been applied", async () => {
			mockLastMigrationId(1);

			await runner.execute();

			expect(logger.log).toHaveBeenCalledWith("Last applied migration ID: 1");
		});

		describe("migrationRegistry based tests", () => {
			let mockMigrationRegistry: any;

			beforeEach(() => {
				mockMigrationRegistry = require("../../MigrationRegistryAuto");

				mockMigrationRegistry.migrationRegistry = createMigrationRegistryMock();
			});

			it("if all migration IDs are less than or equal to lastMigrationId, none of them need to run", async () => {
				mockLastMigrationId(13);

				await runner.execute();

				expect(logger.log).toHaveBeenCalledWith("No pending migrations to run.");

				for (const migration of mockMigrationRegistry.migrationRegistry) {
					expect(migration.up).not.toHaveBeenCalled();
				}
			});

			it("if some migration IDs are greater than lastMigrationId, only those need to run", async () => {
				mockLastMigrationId(2);

				await runner.execute();

				expect(logger.log).not.toHaveBeenCalledWith("No pending migrations to run.");

				expect(mockMigrationRegistry.migrationRegistry[0].up).not.toHaveBeenCalled();

				expect(mockMigrationRegistry.migrationRegistry[1].up).not.toHaveBeenCalled();

				expect(mockMigrationRegistry.migrationRegistry[2].up).toHaveBeenCalledTimes(1);
			});

			it("if all migration IDs are greater than lastMigrationId, all of them need to run", async () => {
				mockLastMigrationId(null);

				await runner.execute();

				expect(logger.log).not.toHaveBeenCalledWith("No pending migrations to run.");

				for (const migration of mockMigrationRegistry.migrationRegistry) {
					expect(migration.up).toHaveBeenCalledTimes(1);
				}
			});

			it("Update appliedCollection with migration Id that just completed", async () => {
				mockLastMigrationId(0);

				await runner.execute();

				for (const migration of mockMigrationRegistry.migrationRegistry) {
					expect(migration.up).toHaveBeenCalledTimes(1);

					expect(mockReplaceOne).toHaveBeenCalledWith({}, {migrationId: migration.id, lastApplied: expect.any(Date)}, {upsert: true});
				}
			});

			it("if a migration throws an exception, it is logged and re-thrown, stopping further migrations", async () => {
				mockLastMigrationId(0);

				const errorMessage = "Test migration error";
				mockMigrationRegistry.migrationRegistry[0].up.mockRejectedValue(new Error(errorMessage));

				await expect(runner.execute()).rejects.toThrow(errorMessage);

				expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed migration 1: 1-migration"), expect.any(Error));

				expect(mockMigrationRegistry.migrationRegistry[1].up).not.toHaveBeenCalled();

				expect(mockMigrationRegistry.migrationRegistry[2].up).not.toHaveBeenCalled();
			});
		});

		it("calls mongo closeMongoDatabase", async () => {
			await runner.execute();

			expect(mongo.closeMongoDatabase).toHaveBeenCalledTimes(1);
		});

		it("sets mongoDb and appliedCollection to undefined after mongo.closeMongoDatabase has been called", async () => {
			await runner.execute();

			expect(runner.mongoDb).toBeUndefined();

			expect(runner.appliedCollection).toBeUndefined();
		});

		it("on an exception being thrown still calls mongo closeMongoDatabase", async () => {
			mongo.getMongoDatabase.mockImplementation(() => {
				throw new Error("Test exception");
			});

			await expect(runner.execute()).rejects.toThrow("Test exception");

			expect(mongo.closeMongoDatabase).toHaveBeenCalledTimes(1);
		});
	});
});
