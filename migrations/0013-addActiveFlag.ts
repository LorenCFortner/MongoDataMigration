import {Db} from "mongodb";
import {IMigrationScript} from "../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db): Promise<void> => {
	const collection = db.collection("CoolStuff");

	console.log("Adding isActive flag to all CoolStuff...");

	await collection.updateMany({}, {$set: {isActive: true}});
};
