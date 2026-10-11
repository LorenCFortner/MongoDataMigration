import "reflect-metadata";
import "./Containers/DependencyInjection";
import {container} from "tsyringe";
import {IRunner} from "./Runner/Runner";
import {ILogger} from "./Logger/Logger";

export async function main(): Promise<void> {
	const logger = container.resolve<ILogger>("ILogger");
	const runner = container.resolve<IRunner>("IRunner");

	logger.startSession("MongoDataMigration");

	try {
		logger.log("Starting runner...");

		await runner.execute();

		logger.log("Runner finished.");
	} finally {
		logger.endSession("MongoDataMigration");
	}
}
// Only run as the actual CLI entry point, never just from being imported (e.g. by a test
// that wants to call main() directly) — same reasoning as the generator script.
if (require.main === module) {
	main().catch(err => {
		console.error(err);

		process.exit(1);
	});
}
