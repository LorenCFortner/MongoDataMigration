// This is an EXAMPLE, not a real migration. It lives in examples/ — outside migrations/ —
// so the registry generator never picks it up and the Runner never executes it against a
// real database. Copy it into migrations/ (with a new, higher number — see the README's
// "Migration Tracking" section) as a starting point for a real one.
import {AnyBulkWriteOperation, ClientSession, Db, Document} from "mongodb";
import {IMigrationScript} from "../../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db, session?: ClientSession): Promise<void> => {
	console.log("Adding data to CoolStuff...");

	const collection = db.collection("CoolStuff");

	const documents = await collection.find({}, {session}).toArray();

	console.log(`Found ${documents.length} documents to process`);

	// Build one bulk operation per document instead of awaiting an updateOne per document —
	// a single bulkWrite call is one round trip to MongoDB instead of one per document.
	const operations: AnyBulkWriteOperation<Document>[] = [];

	for (const doc of documents) {
		if (doc.name && typeof doc.name === "string") {
			const trailingNumberMatch = doc.name.match(/(\d+)$/);

			if (trailingNumberMatch) {
				const numberFromName = parseInt(trailingNumberMatch[1], 10);

				console.log(`Processing ${doc.name}, extracted number: ${numberFromName}`);

				operations.push({
					updateOne: {
						filter: {_id: doc._id},
						update: {$set: {data: numberFromName}},
					},
				});
			} else {
				console.log(`No number found at end of name: ${doc.name}`);
			}
		} else {
			console.log(`Document ${doc._id} has no valid name field`);
		}
	}

	if (operations.length > 0) {
		await collection.bulkWrite(operations, {session});
	}

	console.log("Finished adding data field to CoolStuff collection");
};
