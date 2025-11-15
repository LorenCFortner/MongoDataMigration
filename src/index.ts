import "reflect-metadata";
import "./Containers/DependencyInjection";
import {container} from "tsyringe";
import {IRunner} from "./Runner/Runner";
import {ILogger} from "./Logger/Logger";

async function main(): Promise<void> {
	const logger = container.resolve<ILogger>("ILogger");
	const runner = container.resolve<IRunner>("IRunner");

	logger.startSession("MongoDataMigration");
	logger.log("Starting runner...");

	await runner.execute();

	logger.log("Runner finished.");
	logger.endSession("MongoDataMigration");
}
main().catch(err => {
	console.error(err);

	process.exit(1);
});
