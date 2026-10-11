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
	let mockDeleteOne: jest.Mock;
	let mockCollection: any;
	let mockLockInsertOne: jest.Mock;
	let mockLockDeleteOne: jest.Mock;
	let mockLockFindOne: jest.Mock;
	let mockLockCollection: any;
	let mockDb: any;

	const createMigrationRegistryMock = () => [
		{id: 1, name: "1-migration", up: jest.fn()},
		{id: 2, name: "2-migration", up: jest.fn()},
		{id: 13, name: "13-migration", up: jest.fn()},
	];

	const setupMongoMocks = (findOneReturnValue: any = null) => {
		mockFindOne = jest.fn().mockResolvedValue(findOneReturnValue);
		mockReplaceOne = jest.fn();
		mockDeleteOne = jest.fn().mockResolvedValue(undefined);
		mockCollection = {
			findOne: mockFindOne,
			replaceOne: mockReplaceOne,
			deleteOne: mockDeleteOne,
		};

		mockLockInsertOne = jest.fn().mockResolvedValue(undefined);
		mockLockDeleteOne = jest.fn().mockResolvedValue(undefined);
		mockLockFindOne = jest.fn().mockResolvedValue(null);
		mockLockCollection = {
			insertOne: mockLockInsertOne,
			deleteOne: mockLockDeleteOne,
			findOne: mockLockFindOne,
		};

		mockDb = {
			collection: jest.fn((name: string) => (name === "_migrations_lock" ? mockLockCollection : mockCollection)),
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
			supportsTransactions: jest.fn().mockResolvedValue(false),
			startSession: jest.fn(),
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
			// appliedCollection is a private field; (runner as any) reaches it for this one
			// assertion. TS privacy is compile-time only, so this is safe and doesn't need
			// the field to be public just for a test to inspect it.
			const originalTeardown = (runner as any).teardownMongo;
			const teardownSpy = jest.spyOn(runner as any, "teardownMongo").mockImplementation(async () => {
				expect((runner as any).appliedCollection).toBeDefined();

				expect((runner as any).appliedCollection).toBe(mockCollection);

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
			// A document already exists under the fixed _id, so getLastMigrationId()
			// resolves on the first lookup without needing the legacy-shape fallback.
			mockLastMigrationId(0);

			await runner.execute();

			expect(mockFindOne).toHaveBeenCalledTimes(1);

			expect(mockFindOne).toHaveBeenCalledWith({_id: "appliedMigrations"});
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

		describe("migration locking", () => {
			it("acquires the lock before checking for pending migrations", async () => {
				await runner.execute();

				expect(mockDb.collection).toHaveBeenCalledWith("_migrations_lock");

				expect(mockLockInsertOne).toHaveBeenCalledWith(expect.objectContaining({_id: "lock", pid: process.pid}));
			});

			it("sets lockCollection to the _migrations_lock collection", async () => {
				const originalTeardown = (runner as any).teardownMongo;
				const teardownSpy = jest.spyOn(runner as any, "teardownMongo").mockImplementation(async () => {
					expect((runner as any).lockCollection).toBe(mockLockCollection);

					await originalTeardown.call(runner);
				});

				try {
					await runner.execute();
				} finally {
					teardownSpy.mockRestore();
				}
			});

			it("releases the lock after a successful run", async () => {
				await runner.execute();

				expect(mockLockDeleteOne).toHaveBeenCalledWith({_id: "lock"});
			});

			it("releases the lock even if a migration fails", async () => {
				mockLastMigrationId(0);

				const mockMigrationRegistry = require("../../MigrationRegistryAuto");
				mockMigrationRegistry.migrationRegistry = createMigrationRegistryMock();
				mockMigrationRegistry.migrationRegistry[0].up.mockRejectedValue(new Error("boom"));

				await expect(runner.execute()).rejects.toThrow("boom");

				expect(mockLockDeleteOne).toHaveBeenCalledWith({_id: "lock"});
			});

			it("sets lockCollection to undefined after teardown", async () => {
				await runner.execute();

				expect((runner as any).lockCollection).toBeUndefined();
			});

			it("refuses to run migrations and does not release the lock when another run already holds it", async () => {
				const duplicateKeyError = Object.assign(new Error("E11000 duplicate key error"), {code: 11000});
				mockLockInsertOne.mockRejectedValue(duplicateKeyError);
				mockLockFindOne.mockResolvedValue({_id: "lock", acquiredAt: new Date("2024-01-01T00:00:00.000Z"), pid: 4242});

				await expect(runner.execute()).rejects.toThrow("Another migration run is already in progress");

				expect(mockFindOne).not.toHaveBeenCalled();

				for (const migration of createMigrationRegistryMock()) {
					expect(migration.up).not.toHaveBeenCalled();
				}

				expect(mockLockDeleteOne).not.toHaveBeenCalled();

				expect(mongo.closeMongoDatabase).toHaveBeenCalledTimes(1);
			});

			it("propagates non-lock errors from the lock insert unchanged", async () => {
				mockLockInsertOne.mockRejectedValue(new Error("connection reset"));

				await expect(runner.execute()).rejects.toThrow("connection reset");

				expect(mockLockDeleteOne).not.toHaveBeenCalled();
			});
		});

		describe("legacy _migrations document migration", () => {
			it("falls back to a shape-based lookup when no document exists under the fixed _id, and uses its value", async () => {
				const legacyId = "some-mongo-assigned-objectid";
				const legacyLastApplied = new Date("2024-01-01T00:00:00.000Z");

				mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce({_id: legacyId, migrationId: 13, lastApplied: legacyLastApplied});

				await runner.execute();

				expect(mockFindOne).toHaveBeenNthCalledWith(1, {_id: "appliedMigrations"});

				expect(mockFindOne).toHaveBeenNthCalledWith(2, {migrationId: {$exists: true}});

				expect(logger.log).toHaveBeenCalledWith("Last applied migration ID: 13");
			});

			it("rewrites the legacy document onto the fixed _id and deletes the old one", async () => {
				const legacyId = "some-mongo-assigned-objectid";
				const legacyLastApplied = new Date("2024-01-01T00:00:00.000Z");

				mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce({_id: legacyId, migrationId: 13, lastApplied: legacyLastApplied});

				await runner.execute();

				expect(mockReplaceOne).toHaveBeenCalledWith(
					{_id: "appliedMigrations"},
					{_id: "appliedMigrations", migrationId: 13, lastApplied: legacyLastApplied},
					{upsert: true}
				);

				expect(mockDeleteOne).toHaveBeenCalledWith({_id: legacyId});
			});

			it("does not treat a genuinely fresh database (no document at all) as a legacy document", async () => {
				// mockFindOne already defaults to resolving null for every call (fresh DB,
				// neither the fixed-_id lookup nor the legacy-shape fallback finds anything).
				await runner.execute();

				expect(logger.log).toHaveBeenCalledWith("Last applied migration ID: 0");

				// No legacy document means nothing to migrate or clean up — the only
				// replaceOne calls below should be the normal per-migration completion
				// writes (all migrations are pending since lastMigrationId is 0), not an
				// extra legacy-migration write.
				expect(mockReplaceOne).toHaveBeenCalledTimes(3);

				expect(mockDeleteOne).not.toHaveBeenCalled();
			});

			it("does not call the legacy fallback at all once a document exists under the fixed _id", async () => {
				mockLastMigrationId(13);

				await runner.execute();

				expect(mockFindOne).toHaveBeenCalledTimes(1);

				expect(mockDeleteOne).not.toHaveBeenCalled();
			});
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

					expect(mockReplaceOne).toHaveBeenCalledWith(
						{_id: "appliedMigrations"},
						{_id: "appliedMigrations", migrationId: migration.id, lastApplied: expect.any(Date)},
						{upsert: true}
					);
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

			it("logs a warning when transactions are not supported", async () => {
				mockLastMigrationId(0);

				await runner.execute();

				expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("transactions are not available"));
			});
		});

		describe("when MongoDB supports transactions", () => {
			let mockSession: any;

			beforeEach(() => {
				mongo.supportsTransactions.mockResolvedValue(true);

				mockSession = {
					withTransaction: jest.fn(async (fn: () => Promise<void>) => {
						await fn();
					}),
					endSession: jest.fn().mockResolvedValue(undefined),
				};

				mongo.startSession.mockReturnValue(mockSession);
			});

			it("does not log the no-transaction warning", async () => {
				mockLastMigrationId(0);

				await runner.execute();

				expect(logger.warn).not.toHaveBeenCalled();
			});

			it("runs each migration's up() inside a transaction, passing the session", async () => {
				mockLastMigrationId(0);

				const mockMigrationRegistry = require("../../MigrationRegistryAuto");

				await runner.execute();

				for (const migration of mockMigrationRegistry.migrationRegistry) {
					expect(migration.up).toHaveBeenCalledWith(mockDb, mockSession);
				}

				expect(mockSession.withTransaction).toHaveBeenCalledTimes(mockMigrationRegistry.migrationRegistry.length);
				expect(mockSession.endSession).toHaveBeenCalledTimes(mockMigrationRegistry.migrationRegistry.length);
			});

			it("records the applied migration inside the same transaction", async () => {
				mockLastMigrationId(0);

				const mockMigrationRegistry = require("../../MigrationRegistryAuto");

				await runner.execute();

				for (const migration of mockMigrationRegistry.migrationRegistry) {
					expect(mockReplaceOne).toHaveBeenCalledWith(
						{_id: "appliedMigrations"},
						{_id: "appliedMigrations", migrationId: migration.id, lastApplied: expect.any(Date)},
						{upsert: true, session: mockSession}
					);
				}
			});

			it("rolls back and does not record the migration as applied if it throws", async () => {
				mockLastMigrationId(0);

				const mockMigrationRegistry = require("../../MigrationRegistryAuto");

				const error = new Error("boom");
				mockMigrationRegistry.migrationRegistry[0].up.mockRejectedValue(error);

				await expect(runner.execute()).rejects.toThrow("boom");

				expect(mockReplaceOne).not.toHaveBeenCalled();

				expect(mockMigrationRegistry.migrationRegistry[1].up).not.toHaveBeenCalled();

				expect(mockSession.endSession).toHaveBeenCalledTimes(1);
			});
		});

		it("calls mongo closeMongoDatabase", async () => {
			await runner.execute();

			expect(mongo.closeMongoDatabase).toHaveBeenCalledTimes(1);
		});

		it("sets mongoDb and appliedCollection to undefined after mongo.closeMongoDatabase has been called", async () => {
			await runner.execute();

			expect((runner as any).mongoDb).toBeUndefined();

			expect((runner as any).appliedCollection).toBeUndefined();
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
