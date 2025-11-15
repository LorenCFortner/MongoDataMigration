import {Db} from "mongodb";
import {IMigrationScript} from "../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db): Promise<void> => {
	console.log("Adding data to CoolStuff...");

	const collection = db.collection("CoolStuff");

	// Get all documents in the collection
	const documents = await collection.find({}).toArray();

	console.log(`Found ${documents.length} documents to process`);

	for (const doc of documents) {
		if (doc.name && typeof doc.name === "string") {
			// Extract number from the end of the name using regex
			const match = doc.name.match(/(\d+)$/);

			if (match) {
				const numberFromName = parseInt(match[1], 10);

				console.log(`Processing ${doc.name}, extracted number: ${numberFromName}`);

				// Update the document to add the data field
				await collection.updateOne({_id: doc._id}, {$set: {data: numberFromName}});
			} else {
				console.log(`No number found at end of name: ${doc.name}`);
			}
		} else {
			console.log(`Document ${doc._id} has no valid name field`);
		}
	}

	console.log("Finished adding data field to CoolStuff collection");
};
