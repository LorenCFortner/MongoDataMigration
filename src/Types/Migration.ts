import {Db} from "mongodb";

export interface IMigrationScript {
	up(db: Db): Promise<void>;
}
