import {injectable, inject} from "tsyringe";
import {ILogger} from "../Logger/Logger";
import {migrationRegistry, migrationCount, Migration} from "../../MigrationRegistryAuto";
import {IMongo} from "../Mongo/Mongo";
import {Collection, Db, Document} from "mongodb";

export interface MigrationDocument extends Document {
	migrationId: number;
	lastApplied: Date;
}

export interface LockDocument extends Document {
	_id: "lock";
	acquiredAt: Date;
	pid: number;
}

export interface IRunner {
	execute(): Promise<void>;
}

const LOCK_DUPLICATE_KEY_ERROR_CODE = 11000;

@injectable()
export class Runner implements IRunner {
	constructor(@inject("ILogger") private readonly logger: ILogger, @inject("IMongo") private readonly mongo: IMongo) {}

	public mongoDb: Db | undefined;

	public appliedCollection: Collection<Document> | undefined;

	public lockCollection: Collection<LockDocument> | undefined;

	private lockAcquired = false;

	async execute(): Promise<void> {
		try {
			await this.setupMongo();

			await this.acquireLock();

			await this.runMigrations();
		} catch (error) {
			this.logger.error("Error occurred during runner.execute():", error);

			throw error;
		} finally {
			await this.releaseLock();

			await this.teardownMongo();
		}
	}

	private async setupMongo(): Promise<void> {
		this.logger.log("Setting up MongoDB connection...");

		this.mongoDb = await this.mongo.getMongoDatabase();

		this.appliedCollection = this.mongoDb.collection("_migrations");

		this.lockCollection = this.mongoDb.collection<LockDocument>("_migrations_lock");

		this.logger.log("MongoDB connection established.");
	}

	private async acquireLock(): Promise<void> {
		if (!this.lockCollection) {
			throw new Error("MongoDB is not set up. Cannot acquire migration lock.");
		}

		this.logger.log("Acquiring migration lock...");

		try {
			// _id has an implicit unique index, so this insert is an atomic "acquire" even
			// if two instances race to run it at the same moment — only one can succeed.
			await this.lockCollection.insertOne({_id: "lock", acquiredAt: new Date(), pid: process.pid});

			this.lockAcquired = true;

			this.logger.log("Migration lock acquired.");
		} catch (error) {
			if (this.isDuplicateKeyError(error)) {
				const existingLock = await this.lockCollection.findOne({_id: "lock"});

				throw new Error(
					"Another migration run is already in progress" +
						(existingLock
							? ` (lock acquired at ${existingLock.acquiredAt.toISOString()} by process ${existingLock.pid}).`
							: ".") +
						" If no other run is actually in progress — for example after a crash left the lock behind — " +
						'delete the document with _id "lock" from the _migrations_lock collection and try again.'
				);
			}

			throw error;
		}
	}

	private async releaseLock(): Promise<void> {
		if (!this.lockAcquired || !this.lockCollection) {
			return;
		}

		this.logger.log("Releasing migration lock...");

		await this.lockCollection.deleteOne({_id: "lock"});

		this.lockAcquired = false;

		this.logger.log("Migration lock released.");
	}

	private isDuplicateKeyError(error: unknown): boolean {
		return typeof error === "object" && error !== null && (error as {code?: number}).code === LOCK_DUPLICATE_KEY_ERROR_CODE;
	}

	private async runMigrations(): Promise<void> {
		if (!this.mongoDb || !this.appliedCollection) {
			throw new Error("MongoDB is not set up. Cannot run migrations.");
		}

		const lastMigration = await this.appliedCollection.findOne<MigrationDocument>();

		const lastMigrationId = lastMigration ? lastMigration.migrationId : 0;

		this.logger.log(`Last applied migration ID: ${lastMigrationId}`);

		const pendingMigrations = migrationRegistry.filter(migration => migration.id > lastMigrationId);
		if (pendingMigrations.length === 0) {
			this.logger.log("No pending migrations to run.");
			return;
		}

		const transactionsSupported = await this.mongo.supportsTransactions();

		if (!transactionsSupported) {
			this.logger.warn(
				"MongoDB transactions are not available on this connection (it is not a replica set or mongos). " +
					"Migrations will run without automatic rollback on failure, so every migration must be safe to run " +
					"more than once. See the README section on transaction safety and idempotency."
			);
		}

		for (const migration of pendingMigrations) {
			this.logger.log(`Running migration ${migration.id}: ${migration.name}`);

			if (transactionsSupported) {
				await this.runMigrationInTransaction(migration);
			} else {
				await this.runMigrationWithoutTransaction(migration);
			}
		}
	}

	private async runMigrationInTransaction(migration: Migration): Promise<void> {
		const session = this.mongo.startSession();

		try {
			await session.withTransaction(async () => {
				await migration.up(this.mongoDb!, session);

				await this.appliedCollection!.replaceOne(
					{},
					{migrationId: migration.id, lastApplied: new Date()},
					{upsert: true, session}
				);
			});

			this.logger.log(`Completed migration ${migration.id}: ${migration.name}`);
		} catch (error) {
			this.logger.error(`Failed migration ${migration.id}: ${migration.name} — transaction rolled back, database left unchanged.`, error);

			throw error;
		} finally {
			await session.endSession();
		}
	}

	private async runMigrationWithoutTransaction(migration: Migration): Promise<void> {
		try {
			await migration.up(this.mongoDb!);

			await this.appliedCollection!.replaceOne({}, {migrationId: migration.id, lastApplied: new Date()}, {upsert: true});

			this.logger.log(`Completed migration ${migration.id}: ${migration.name}`);
		} catch (error) {
			this.logger.error(`Failed migration ${migration.id}: ${migration.name}`, error);

			throw error;
		}
	}

	private async teardownMongo(): Promise<void> {
		this.logger.log("Tearing down MongoDB connection...");

		await this.mongo.closeMongoDatabase();

		this.mongoDb = undefined;

		this.appliedCollection = undefined;

		this.lockCollection = undefined;

		this.logger.log("MongoDB connection closed.");
	}
}
