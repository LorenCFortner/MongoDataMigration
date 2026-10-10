import {ClientSession, Db} from "mongodb";

export interface IMigrationScript {
	up(db: Db, session?: ClientSession): Promise<void>;
}
