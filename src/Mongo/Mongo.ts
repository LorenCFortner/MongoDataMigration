import {Db, MongoClient} from "mongodb";
import {injectable} from "tsyringe";

export interface IMongo {
	getMongoDatabase(): Promise<Db>;

	closeMongoDatabase(): Promise<void>;
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

	async closeMongoDatabase(): Promise<void> {
		if (this.client) {
			await this.client.close();

			this.client = undefined;
		}
	}
}
