import {Db} from "mongodb";
import {IMigrationScript} from "../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db): Promise<void> => {
	const collection = db.collection("CoolStuff");

	console.log("Adding CoolStuff test data...");

	await collection.insertMany([
		{name: "Test Item 1", info: "This is a test data 1."},
		{name: "Test Item 2", info: "This is a test data 2."},
		{name: "Test Item 3", info: "This is a test data 3."},
	]);
};
