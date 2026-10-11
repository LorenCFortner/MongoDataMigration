import "reflect-metadata";

// Replace the real DependencyInjection module entirely, so importing index.ts for its
// `main` export doesn't register (or construct) the real Logger/Mongo/Runner — in
// particular, the real Mongo would throw immediately if MONGO_DB isn't set, which has
// nothing to do with what this file tests.
jest.mock("./Containers/DependencyInjection", () => ({
	container: require("tsyringe").container,
}));

import {container} from "tsyringe";
import {ILogger} from "./Logger/Logger";
import {IRunner} from "./Runner/Runner";
// require.main !== module under Jest (see index.ts), so importing this never
// auto-invokes main() as a side effect — only the explicit calls below do.
import {main} from "./index";

describe("index.ts main()", () => {
	let logger: jest.Mocked<ILogger>;
	let runner: jest.Mocked<IRunner>;

	beforeEach(() => {
		container.reset();

		logger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			startSession: jest.fn(),
			endSession: jest.fn(),
		};

		runner = {
			execute: jest.fn().mockResolvedValue(undefined),
		};

		container.register("ILogger", {useValue: logger});
		container.register("IRunner", {useValue: runner});
	});

	afterEach(() => {
		container.reset();
		jest.clearAllMocks();
	});

	it("is not the Node.js entry point when loaded by Jest", () => {
		expect(require.main).not.toBe(module);
	});

	it("starts and ends the session, and runs the runner, in order, on success", () => {
		const callOrder: string[] = [];

		logger.startSession.mockImplementation(() => callOrder.push("startSession"));
		runner.execute.mockImplementation(async () => {
			callOrder.push("execute");
		});
		logger.endSession.mockImplementation(() => callOrder.push("endSession"));

		return main().then(() => {
			expect(callOrder).toEqual(["startSession", "execute", "endSession"]);
		});
	});

	it("calls endSession even when runner.execute() throws", async () => {
		const error = new Error("boom");

		runner.execute.mockRejectedValue(error);

		await expect(main()).rejects.toThrow("boom");

		expect(logger.startSession).toHaveBeenCalledWith("MongoDataMigration");

		expect(logger.endSession).toHaveBeenCalledWith("MongoDataMigration");
	});

	it("still propagates the error after calling endSession", async () => {
		const error = new Error("boom");

		runner.execute.mockRejectedValue(error);

		await expect(main()).rejects.toThrow(error);
	});

	it("does not log 'Runner finished.' when runner.execute() throws", async () => {
		runner.execute.mockRejectedValue(new Error("boom"));

		await expect(main()).rejects.toThrow();

		expect(logger.log).not.toHaveBeenCalledWith("Runner finished.");
	});
});
