import {ClientSession, Db, MongoClient} from "mongodb";
import {injectable} from "tsyringe";

export interface IMongo {
	getMongoDatabase(): Promise<Db>;

	closeMongoDatabase(): Promise<void>;

	startSession(): ClientSession;

	supportsTransactions(): Promise<boolean>;
}

@injectable()
export class Mongo implements IMongo {
	public readonly uri: string;

	public readonly databaseName: string;

	private client: MongoClient | undefined;

	constructor() {
		this.uri = process.env.MONGO_URI || "mongodb://localhost:27017";

		const databaseName = process.env.MONGO_DB;

		if (!databaseName) {
			// No default here on purpose: a missing MONGO_DB used to fall back to a throwaway
			// "TestMigrateMongo" database. Migrations would then run successfully, report
			// success, and record themselves as applied — against the wrong database, with
			// nothing to indicate that happened. Failing immediately is much cheaper than that.
			throw new Error(
				"MONGO_DB environment variable is not set. Set it to the target database name before " +
					"running migrations — there is no default, so a missing config can't silently run " +
					"against the wrong database."
			);
		}

		this.databaseName = databaseName;
	}

	async getMongoDatabase(): Promise<Db> {
		await this.closeExistingConnection();

		this.client = new MongoClient(this.uri);

		await this.client.connect();

		const db = this.client.db(this.databaseName);

		return db;
	}

	private async closeExistingConnection(): Promise<void> {
		if (this.client) {
			await this.client.close();
		}
	}

	startSession(): ClientSession {
		if (!this.client) {
			throw new Error("MongoDB client is not connected. Call getMongoDatabase() first.");
		}

		return this.client.startSession();
	}

	async supportsTransactions(): Promise<boolean> {
		if (!this.client) {
			throw new Error("MongoDB client is not connected. Call getMongoDatabase() first.");
		}

		// Transactions require the deployment to be a replica set or a sharded cluster (mongos).
		// A standalone mongod has no replica set name and is not a mongos router.
		const admin = this.client.db("admin");

		const result = await admin.command({hello: 1}).catch(() => admin.command({isMaster: 1}));

		return Boolean(result.setName) || result.msg === "isdbgrid";
	}

	async closeMongoDatabase(): Promise<void> {
		if (this.client) {
			await this.client.close();

			this.client = undefined;
		}
	}
}
