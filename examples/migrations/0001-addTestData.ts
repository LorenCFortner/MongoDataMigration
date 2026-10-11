// This is an EXAMPLE, not a real migration. It lives in examples/ — outside migrations/ —
// so the registry generator never picks it up and the Runner never executes it against a
// real database. Copy it into migrations/ (with a new, higher number — see the README's
// "Migration Tracking" section) as a starting point for a real one.
import {ClientSession, Db} from "mongodb";
import {IMigrationScript} from "../../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db, session?: ClientSession): Promise<void> => {
	const collection = db.collection("CoolStuff");

	console.log("Adding CoolStuff test data...");

	const items = [
		{name: "Test Item 1", info: "This is a test data 1."},
		{name: "Test Item 2", info: "This is a test data 2."},
		{name: "Test Item 3", info: "This is a test data 3."},
	];

	// Upsert on `name` instead of insertMany so this migration is safe to run more than once:
	// if it only partially completes (e.g. on a standalone server with no transaction to roll
	// it back), re-running it won't create duplicate rows.
	await collection.bulkWrite(
		items.map(item => ({
			updateOne: {
				filter: {name: item.name},
				update: {$set: item},
				upsert: true,
			},
		})),
		{session}
	);
};
