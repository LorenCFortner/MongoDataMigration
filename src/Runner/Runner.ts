import {injectable, inject} from "tsyringe";
import {ILogger} from "../Logger/Logger";
import {migrationRegistry, migrationCount} from "../../MigrationRegistryAuto";
import {IMongo} from "../Mongo/Mongo";
import {Collection, Db, Document} from "mongodb";

export interface MigrationDocument extends Document {
	migrationId: number;
	lastApplied: Date;
}

export interface IRunner {
	execute(): Promise<void>;
}

@injectable()
export class Runner implements IRunner {
	constructor(@inject("ILogger") private readonly logger: ILogger, @inject("IMongo") private readonly mongo: IMongo) {}

	public mongoDb: Db | undefined;

	public appliedCollection: Collection<Document> | undefined;

	async execute(): Promise<void> {
		try {
			await this.setupMongo();

			await this.runMigrations();
		} catch (error) {
			this.logger.error("Error occurred during runner.execute():", error);

			throw error;
		} finally {
			await this.teardownMongo();
		}
	}

	private async setupMongo(): Promise<void> {
		this.logger.log("Setting up MongoDB connection...");

		this.mongoDb = await this.mongo.getMongoDatabase();

		this.appliedCollection = this.mongoDb.collection("_migrations");

		this.logger.log("MongoDB connection established.");
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

		for (const migration of pendingMigrations) {
			this.logger.log(`Running migration ${migration.id}: ${migration.name}`);

			try {
				await migration.up(this.mongoDb);

				await this.appliedCollection.replaceOne({}, {migrationId: migration.id, lastApplied: new Date()}, {upsert: true});

				this.logger.log(`Completed migration ${migration.id}: ${migration.name}`);
			} catch (error) {
				this.logger.error(`Failed migration ${migration.id}: ${migration.name}`, error);

				throw error;
			}
		}
	}

	private async teardownMongo(): Promise<void> {
		this.logger.log("Tearing down MongoDB connection...");

		await this.mongo.closeMongoDatabase();

		this.mongoDb = undefined;

		this.appliedCollection = undefined;

		this.logger.log("MongoDB connection closed.");
	}
}
