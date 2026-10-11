// This is an EXAMPLE, not a real migration. It lives in examples/ — outside migrations/ —
// so the registry generator never picks it up and the Runner never executes it against a
// real database. Copy it into migrations/ (with a new, higher number — see the README's
// "Migration Tracking" section) as a starting point for a real one.
import {ClientSession, Db} from "mongodb";
import {IMigrationScript} from "../../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db, session?: ClientSession): Promise<void> => {
	const collection = db.collection("CoolStuff");

	console.log("Adding isActive flag to all CoolStuff...");

	await collection.updateMany({}, {$set: {isActive: true}}, {session});
};
