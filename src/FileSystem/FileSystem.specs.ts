import "reflect-metadata";
import {container} from "tsyringe";
import {FileSystem, IFileSystem} from "./FileSystem";
import * as fs from "fs";
import * as path from "path";

describe("FileSystem", () => {
	let fileSystem: IFileSystem;

	beforeEach(() => {
		container.reset();
		fileSystem = container.resolve(FileSystem);
	});

	afterEach(() => {
		container.reset();
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});
	describe("Basic Setup", () => {
		it("should be defined", () => {
			expect(fileSystem).toBeDefined();
		});

		it("should be an instance of FileSystem", () => {
			expect(fileSystem).toBeInstanceOf(FileSystem);
		});

		it("should implement IFileSystem interface", () => {
			const fs: IFileSystem = fileSystem;
			expect(fs).toBeDefined();
		});
	});

	describe("Coverage Completeness", () => {
		it("should report missing fs synchronous methods (informational)", () => {
			const allFsMethods = Object.getOwnPropertyNames(fs).filter(
				name => typeof (fs as any)[name] === "function" && name.endsWith("Sync") && !name.startsWith("_")
			);

			const missingMethods: string[] = [];
			allFsMethods.forEach(method => {
				if (typeof (fileSystem as any)[method] !== "function") {
					missingMethods.push(method);
				}
			});

			if (missingMethods.length > 0) {
				console.log("Found fs sync methods:", allFsMethods);
				console.warn(`Missing fs sync methods: ${missingMethods.join(", ")}`);
				console.warn("Add them if needed for your use case.");
			}

			expect(true).toBe(true);
		});

		it("should report missing path methods (informational)", () => {
			const allPathMethods = Object.getOwnPropertyNames(path).filter(name => typeof (path as any)[name] === "function" && !name.startsWith("_"));

			const missingMethods: string[] = [];
			allPathMethods.forEach(method => {
				if (typeof (fileSystem as any)[method] !== "function") {
					missingMethods.push(method);
				}
			});

			if (missingMethods.length > 0) {
				console.log("Found path methods:", allPathMethods);
				console.warn(`Missing path methods: ${missingMethods.join(", ")}`);
				console.warn("Add them if needed for your use case.");
			}

			expect(true).toBe(true);
		});

		it("should cover essential fs async/streaming methods", () => {
			const asyncMethods = ["createReadStream", "createWriteStream", "watch", "watchFile", "unwatchFile"];

			const missingMethods: string[] = [];
			asyncMethods.forEach(method => {
				if (typeof (fileSystem as any)[method] !== "function") {
					missingMethods.push(method);
				}
			});

			expect(missingMethods).toEqual([]);
		});

		it("should have fs constants", () => {
			expect(fileSystem.constants).toBeDefined();
			expect(fileSystem.constants.F_OK).toBeDefined();
			expect(fileSystem.constants.R_OK).toBeDefined();
			expect(fileSystem.constants.W_OK).toBeDefined();
			expect(fileSystem.constants.X_OK).toBeDefined();
		});

		it("should warn about any extra fs methods not covered", () => {
			const allFsMethods = Object.getOwnPropertyNames(fs).filter(
				name => typeof (fs as any)[name] === "function" && !name.startsWith("_") && !name.includes("Promises")
			);

			const notCovered: string[] = [];
			allFsMethods.forEach(method => {
				if (typeof (fileSystem as any)[method] !== "function") {
					notCovered.push(method);
				}
			});

			if (notCovered.length > 0) {
				console.log("Found fs sync methods:", allFsMethods);
				console.warn("These fs methods are not covered in FileSystem:", notCovered);
				console.warn("Consider adding them if they are needed for your use case.");
			}

			expect(true).toBe(true);
		});
	});
});
