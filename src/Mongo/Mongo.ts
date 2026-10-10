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
	constructor() {}

	public readonly uri = process.env.MONGO_URI || "mongodb://localhost:27017";

	public readonly databaseName = process.env.MONGO_DB || "TestMigrateMongo";

	private client: MongoClient | undefined;

	async getMongoDatabase(): Promise<Db> {
		this.client = new MongoClient(this.uri);

		await this.client.connect();

		const db = this.client.db(this.databaseName);

		return db;
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
