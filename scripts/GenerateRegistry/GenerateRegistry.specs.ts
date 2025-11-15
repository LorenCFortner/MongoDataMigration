const mockLogger = {
	log: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	startSession: jest.fn(),
	endSession: jest.fn(),
};

jest.doMock("../../src/Logger/Logger", () => ({
	Logger: jest.fn().mockImplementation(() => mockLogger),
	ILogger: undefined,
}));

import {extractMigrationId, generateRegistryContent, generateRegistry, verifyAllMigrations} from "./GenerateRegistry";
import {IFileSystem} from "../../src/FileSystem/FileSystem";
import {container} from "tsyringe";
import path from "path";

describe("GenerateRegistry", () => {
	describe("extractMigrationId", () => {
		it("should extract migration ID from valid filename", () => {
			const result = extractMigrationId("1-addTestData.ts");

			expect(result).toBe(1);
		});

		it("should extract multi-digit migration ID", () => {
			const result = extractMigrationId("13-addActiveFlag.ts");

			expect(result).toBe(13);
		});

		it("should extract three-digit migration ID", () => {
			const result = extractMigrationId("123-someOtherMigration.ts");

			expect(result).toBe(123);
		});

		it("should throw error for invalid filename format", () => {
			expect(() => extractMigrationId("invalid-filename.ts")).toThrow(
				'Invalid migration filename format: invalid-filename.ts. Expected format: "number-description.ts"'
			);
		});

		it("should throw error for filename without dash", () => {
			expect(() => extractMigrationId("1addTestData.ts")).toThrow(
				'Invalid migration filename format: 1addTestData.ts. Expected format: "number-description.ts"'
			);
		});

		it("should throw error for filename starting with non-number", () => {
			expect(() => extractMigrationId("abc-addTestData.ts")).toThrow(
				'Invalid migration filename format: abc-addTestData.ts. Expected format: "number-description.ts"'
			);
		});
	});

	describe("verifyAllMigrations", () => {
		beforeEach(() => {
			jest.clearAllMocks();
			container.reset();
		});

		afterEach(() => {
			jest.restoreAllMocks();
			container.reset();
		});
		it("should log verification start and completion messages", async () => {
			const mockMigrationModule = {
				up: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportFunction = jest.fn().mockResolvedValue(mockMigrationModule);

			const files = ["0001-addTestData.ts"];

			const migrationsDirectory = "/test/migrations";

			await verifyAllMigrations(files, migrationsDirectory, mockImportFunction);

			expect(mockLogger.log).toHaveBeenCalledWith("\nVerifying migrations implement IMigrationScript...\n");

			expect(mockLogger.log).toHaveBeenCalledWith("0001-addTestData - implements IMigrationScript correctly (verified properties: up)");

			expect(mockLogger.log).toHaveBeenCalledWith("\nAll 1 migrations verified successfully!\n");
		});

		it("should verify multiple migration files successfully", async () => {
			const mockMigrationModule = {
				up: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportFunction = jest.fn().mockResolvedValue(mockMigrationModule);

			const files = ["0001-addTestData.ts", "0002-addDataToTheTestData.ts"];

			const migrationsDirectory = "/test/migrations";

			await verifyAllMigrations(files, migrationsDirectory, mockImportFunction);

			expect(mockLogger.log).toHaveBeenCalledWith("\nVerifying migrations implement IMigrationScript...\n");

			expect(mockLogger.log).toHaveBeenCalledWith("0001-addTestData - implements IMigrationScript correctly (verified properties: up)");

			expect(mockLogger.log).toHaveBeenCalledWith("0002-addDataToTheTestData - implements IMigrationScript correctly (verified properties: up)");

			expect(mockLogger.log).toHaveBeenCalledWith("\nAll 2 migrations verified successfully!\n");
		});

		it("should handle empty file list", async () => {
			const mockImportFunction = jest.fn();

			const files: string[] = [];

			const migrationsDirectory = "/test/migrations";

			await verifyAllMigrations(files, migrationsDirectory, mockImportFunction);

			expect(mockLogger.log).toHaveBeenCalledWith("\nVerifying migrations implement IMigrationScript...\n");

			expect(mockLogger.log).toHaveBeenCalledWith("\nAll 0 migrations verified successfully!\n");

			expect(mockImportFunction).not.toHaveBeenCalled();
		});

		it("should throw error when migration file does not exist", async () => {
			const mockImportFunction = jest.fn().mockRejectedValue(new Error("Cannot resolve module"));

			const files = ["999-nonexistentMigration.ts"];

			const migrationsDirectory = "/test/migrations";

			await expect(verifyAllMigrations(files, migrationsDirectory, mockImportFunction)).rejects.toThrow(
				"Migration verification failed for 999-nonexistentMigration"
			);
		});

		it("should use correct migration directory path", async () => {
			const mockMigrationModule = {
				up: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportSpy = jest.fn().mockResolvedValue(mockMigrationModule);

			const files = ["0001-addTestData.ts"];

			const customMigrationsDirectory = "/custom/migrations";

			await verifyAllMigrations(files, customMigrationsDirectory, mockImportSpy);

			expect(mockImportSpy).toHaveBeenCalledWith(path.resolve("/custom/migrations", "0001-addTestData.ts"));

			expect(mockLogger.log).toHaveBeenCalledWith("0001-addTestData - implements IMigrationScript correctly (verified properties: up)");
		});

		it("should process files in the order provided", async () => {
			const mockMigrationModule = {
				up: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportFunction = jest.fn().mockResolvedValue(mockMigrationModule);

			const files = ["0002-addDataToTheTestData.ts", "0001-addTestData.ts"];

			const migrationsDirectory = "/test/migrations";

			await verifyAllMigrations(files, migrationsDirectory, mockImportFunction);

			const logCalls = mockLogger.log.mock.calls.map((call: any) => call[0]);

			const verificationLogs = logCalls.filter((log: any) => log.includes("implements IMigrationScript correctly"));

			expect(verificationLogs[0]).toContain("0002-addDataToTheTestData");

			expect(verificationLogs[1]).toContain("0001-addTestData");
		});

		it("should stop verification on first error", async () => {
			const mockMigrationModule = {
				up: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportSpy = jest
				.fn()
				.mockResolvedValueOnce(mockMigrationModule)
				.mockRejectedValueOnce(new Error("Cannot resolve module"))
				.mockResolvedValueOnce(mockMigrationModule);

			const files = ["0001-addTestData.ts", "999-nonexistentMigration.ts", "0002-addDataToTheTestData.ts"];

			const migrationsDirectory = "/test/migrations";

			await expect(verifyAllMigrations(files, migrationsDirectory, mockImportSpy)).rejects.toThrow(
				"Migration verification failed for 999-nonexistentMigration"
			);

			expect(mockLogger.log).toHaveBeenCalledWith("0001-addTestData - implements IMigrationScript correctly (verified properties: up)");

			const logCalls = mockLogger.log.mock.calls.map((call: any) => call[0]);

			const hasThirdMigrationLog = logCalls.some((log: any) => log.includes("0002-addDataToTheTestData"));

			expect(hasThirdMigrationLog).toBe(false);

			expect(mockImportSpy).toHaveBeenCalledTimes(2);
		});

		it("should correctly count verified migrations", async () => {
			const mockMigrationModule = {
				up: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportFunction = jest.fn().mockResolvedValue(mockMigrationModule);

			const files = ["0001-addTestData.ts", "0002-addDataToTheTestData.ts", "0013-addActiveFlag.ts"];

			const migrationsDirectory = "/test/migrations";

			await verifyAllMigrations(files, migrationsDirectory, mockImportFunction);

			expect(mockLogger.log).toHaveBeenCalledWith("\nAll 3 migrations verified successfully!\n");
		});

		it("should handle interface property verification dynamically", async () => {
			const mockMigrationModule = {
				up: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportFunction = jest.fn().mockResolvedValue(mockMigrationModule);

			const files = ["0001-addTestData.ts"];

			const migrationsDirectory = "/test/migrations";

			await verifyAllMigrations(files, migrationsDirectory, mockImportFunction);

			expect(mockLogger.log).toHaveBeenCalledWith("0001-addTestData - implements IMigrationScript correctly (verified properties: up)");
		});

		it("should throw error when migration is missing required property", async () => {
			const mockInvalidMigrationModule = {
				down: jest.fn().mockResolvedValue(undefined),
			};

			const mockImportFunction = jest.fn().mockResolvedValue(mockInvalidMigrationModule);

			const files = ["invalid-migration.ts"];

			const migrationsDirectory = "/test/migrations";

			await expect(verifyAllMigrations(files, migrationsDirectory, mockImportFunction)).rejects.toThrow(
				"Migration invalid-migration does not export required property 'up' from IMigrationScript interface"
			);
		});

		it("should throw error when migration property is not a function", async () => {
			const mockInvalidMigrationModule = {
				up: "not a function",
			};

			const mockImportFunction = jest.fn().mockResolvedValue(mockInvalidMigrationModule);

			const files = ["invalid-migration.ts"];

			const migrationsDirectory = "/test/migrations";

			await expect(verifyAllMigrations(files, migrationsDirectory, mockImportFunction)).rejects.toThrow(
				"Migration invalid-migration exports 'up' but it's not a function (required by IMigrationScript interface)"
			);
		});
	});

	describe("generateRegistryContent", () => {
		it("should return empty string for empty file list", () => {
			const result = generateRegistryContent([]);

			expect(result).toBe("");
		});

		it("should generate registry content for single migration file", () => {
			const files = ["1-addTestData.ts"];

			const result = generateRegistryContent(files);

			expect(result).toContain('import * as migration0 from "./migrations/1-addTestData";');

			expect(result).toContain("id: 1");

			expect(result).toContain('name: "1-addTestData"');

			expect(result).toContain("up: migration0.up");

			expect(result).toContain("export const migrationCount = 1;");
		});

		it("should generate registry content for multiple migration files", () => {
			const files = ["1-addTestData.ts", "2-addDataToTheTestData.ts", "13-addActiveFlag.ts"];

			const result = generateRegistryContent(files);

			expect(result).toContain('import * as migration0 from "./migrations/1-addTestData";');

			expect(result).toContain('import * as migration1 from "./migrations/2-addDataToTheTestData";');

			expect(result).toContain('import * as migration2 from "./migrations/13-addActiveFlag";');

			expect(result).toContain("id: 1");

			expect(result).toContain('name: "1-addTestData"');

			expect(result).toContain("up: migration0.up");

			expect(result).toContain("id: 2");

			expect(result).toContain('name: "2-addDataToTheTestData"');

			expect(result).toContain("up: migration1.up");

			expect(result).toContain("id: 13");

			expect(result).toContain('name: "13-addActiveFlag"');

			expect(result).toContain("up: migration2.up");

			expect(result).toContain("export const migrationCount = 3;");
		});

		it("should generate complete TypeScript interface and structure", () => {
			const files = ["1-addTestData.ts"];

			const result = generateRegistryContent(files);

			expect(result).toContain('import { IMigrationScript } from "./src/Types/Migration";');

			expect(result).toContain("export interface Migration extends IMigrationScript {");

			expect(result).toContain("id: number;");

			expect(result).toContain("name: string;");

			expect(result).toContain("export const migrationRegistry: Migration[] = [");

			expect(result).toContain("].sort((a, b) => a.id - b.id);");
		});
	});

	describe("generateRegistry", () => {
		let mockFileSystem: jest.Mocked<IFileSystem>;
		let mockVerifyFunction: jest.MockedFunction<typeof verifyAllMigrations>;

		beforeEach(() => {
			jest.clearAllMocks();
			container.reset();

			mockFileSystem = {
				readdirSync: jest.fn().mockReturnValue([]),
				writeFileSync: jest.fn().mockReturnValue(undefined),
			} as any;

			mockVerifyFunction = jest.fn().mockResolvedValue(undefined);
		});

		afterEach(() => {
			jest.restoreAllMocks();
			container.reset();
		});

		it("should handle empty migrations directory", async () => {
			const mockImportFunction = jest.fn();

			(mockFileSystem.readdirSync as jest.Mock).mockReturnValue([]);

			await generateRegistry("/test/migrations", "/test/output.ts", mockFileSystem, mockVerifyFunction, mockImportFunction);

			expect(mockFileSystem.readdirSync).toHaveBeenCalledWith("/test/migrations", {withFileTypes: false});

			expect(mockFileSystem.writeFileSync).not.toHaveBeenCalled();

			expect(mockLogger.log).toHaveBeenCalledWith("No migration files found.");

			expect(mockVerifyFunction).not.toHaveBeenCalled();
		});

		it("should filter non-TypeScript files", async () => {
			const mockImportFunction = jest.fn();

			(mockFileSystem.readdirSync as jest.Mock).mockReturnValue(["1-test.ts", "2-test.js", "readme.txt", "3-another.ts"]);

			await generateRegistry("/test/migrations", "/test/output.ts", mockFileSystem, mockVerifyFunction, mockImportFunction);

			expect(mockFileSystem.writeFileSync).toHaveBeenCalledWith("/test/output.ts", expect.stringContaining("export const migrationCount = 2;"));

			expect(mockVerifyFunction).toHaveBeenCalledWith(["1-test.ts", "3-another.ts"], "/test/migrations", mockImportFunction);
		});

		it("should sort migrations by ID", async () => {
			const mockImportFunction = jest.fn();

			(mockFileSystem.readdirSync as jest.Mock).mockReturnValue(["13-addActiveFlag.ts", "1-addTestData.ts", "2-addDataToTheTestData.ts"]);

			await generateRegistry("/test/migrations", "/test/output.ts", mockFileSystem, mockVerifyFunction, mockImportFunction);

			const writtenContent = (mockFileSystem.writeFileSync as jest.Mock).mock.calls[0][1] as string;

			const migration0Index = writtenContent.indexOf("import * as migration0");

			const migration1Index = writtenContent.indexOf("import * as migration1");

			const migration2Index = writtenContent.indexOf("import * as migration2");

			expect(migration0Index).toBeLessThan(migration1Index);

			expect(migration1Index).toBeLessThan(migration2Index);

			expect(writtenContent).toContain('migration0 from "./migrations/1-addTestData"');

			expect(writtenContent).toContain('migration1 from "./migrations/13-addActiveFlag"');

			expect(writtenContent).toContain('migration2 from "./migrations/2-addDataToTheTestData"');

			expect(mockVerifyFunction).toHaveBeenCalledWith(
				["1-addTestData.ts", "13-addActiveFlag.ts", "2-addDataToTheTestData.ts"],
				"/test/migrations",
				mockImportFunction
			);
		});

		it("should generate registry with correct file paths and content", async () => {
			const mockImportFunction = jest.fn();

			(mockFileSystem.readdirSync as jest.Mock).mockReturnValue(["1-test.ts", "2-test.ts"]);

			await generateRegistry("/custom/migrations", "/custom/output.ts", mockFileSystem, mockVerifyFunction, mockImportFunction);

			expect(mockFileSystem.readdirSync).toHaveBeenCalledWith("/custom/migrations", {withFileTypes: false});

			expect(mockFileSystem.writeFileSync).toHaveBeenCalledWith("/custom/output.ts", expect.stringContaining("export const migrationCount = 2;"));

			expect(mockLogger.log).toHaveBeenCalledWith("Generated /custom/output.ts with 2 migrations.");

			expect(mockVerifyFunction).toHaveBeenCalledWith(["1-test.ts", "2-test.ts"], "/custom/migrations", mockImportFunction);
		});

		it("should use default parameters when not provided", async () => {
			const mockImportFunction = jest.fn();

			(mockFileSystem.readdirSync as jest.Mock).mockReturnValue(["1-test.ts"]);

			await generateRegistry(undefined, undefined, mockFileSystem, mockVerifyFunction, mockImportFunction);

			expect(mockFileSystem.readdirSync).toHaveBeenCalled();

			expect(mockFileSystem.writeFileSync).toHaveBeenCalled();

			expect(mockVerifyFunction).toHaveBeenCalled();
		});

		it("should handle verification errors properly", async () => {
			const mockProcessExit = jest.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("process.exit called");
			});

			const mockImportFunction = jest.fn();

			(mockFileSystem.readdirSync as jest.Mock).mockReturnValue(["1-test.ts"]);

			mockVerifyFunction.mockRejectedValue(new Error("Migration verification failed"));

			await expect(generateRegistry("/test/migrations", "/test/output.ts", mockFileSystem, mockVerifyFunction, mockImportFunction)).rejects.toThrow(
				"process.exit called"
			);

			expect(mockLogger.error).toHaveBeenCalledWith("Migration verification failed!");

			expect(mockLogger.error).toHaveBeenCalledWith("Migration verification failed");

			expect(mockProcessExit).toHaveBeenCalledWith(1);

			expect(mockFileSystem.writeFileSync).not.toHaveBeenCalled();
		});
	});
});
