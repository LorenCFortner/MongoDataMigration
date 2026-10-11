import "reflect-metadata";
import {container} from "tsyringe";
import * as path from "path";
import {Logger} from "./Logger";
import {IFileSystem} from "../FileSystem/FileSystem";

describe("Logger", () => {
	let logger: Logger;
	let fileSystem: jest.Mocked<IFileSystem>;

	const createMockFileSystem = (): jest.Mocked<IFileSystem> =>
		({
			existsSync: jest.fn().mockReturnValue(false),
			mkdirSync: jest.fn(),
			appendFileSync: jest.fn(),
			writeFileSync: jest.fn(),
		} as unknown as jest.Mocked<IFileSystem>);

	let originalConsoleLog: typeof console.log;
	let originalConsoleError: typeof console.error;
	let originalConsoleWarn: typeof console.warn;

	let originalExecPath: string;
	let originalPkg: any;
	let originalCwd: typeof process.cwd;

	beforeAll(() => {
		originalConsoleLog = console.log;
		originalConsoleError = console.error;
		originalConsoleWarn = console.warn;
		originalExecPath = process.execPath;
		originalPkg = (process as any).pkg;
		originalCwd = process.cwd;
	});

	beforeEach(() => {
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
		console.warn = originalConsoleWarn;

		Object.defineProperty(process, "execPath", {
			value: originalExecPath,
			writable: true,
			configurable: true,
		});

		if (originalPkg === undefined) {
			delete (process as any).pkg;
		} else {
			(process as any).pkg = originalPkg;
		}

		container.clearInstances();
		container.reset();

		fileSystem = createMockFileSystem();

		container.register("IFileSystem", {useValue: fileSystem});

		logger = container.resolve(Logger);
	});

	afterEach(() => {
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
		console.warn = originalConsoleWarn;

		Object.defineProperty(process, "execPath", {
			value: originalExecPath,
			writable: true,
			configurable: true,
		});

		if (originalPkg === undefined) {
			delete (process as any).pkg;
		} else {
			(process as any).pkg = originalPkg;
		}

		container.clearInstances();
		container.reset();

		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe("On initial load should", () => {
		it("logger to be defined", () => {
			expect(logger).toBeDefined();
		});

		it("be an instance of Logger", () => {
			expect(logger).toBeInstanceOf(Logger);
		});

		it("call ensureLogDirectory during construction", () => {
			expect(fileSystem.existsSync).toHaveBeenCalledWith(logger.logDir);
		});

		it("call mkdirSync if log directory does not exist during construction", () => {
			fileSystem.existsSync.mockReturnValue(false);

			const newLogger = container.resolve(Logger);

			expect(fileSystem.mkdirSync).toHaveBeenCalledWith(newLogger.logDir, {recursive: true});
		});
	});

	describe("console override behavior", () => {
		beforeEach(() => {
			logger.startSession("Test");

			jest.clearAllMocks();
		});

		it("should call fileSystem.appendFileSync when console.log is used", () => {
			console.log("TEST Information message");

			expect(fileSystem.appendFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining("[INF] TEST Information message"));
		});

		it("should call fileSystem.appendFileSync when console.warn is used", () => {
			console.warn("TEST Warning message");

			expect(fileSystem.appendFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining("[WRN] TEST Warning message"));
		});

		it("should call fileSystem.appendFileSync when console.error is used", () => {
			console.error("TEST Error message");

			expect(fileSystem.appendFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining("[ERR] TEST Error message"));
		});
	});

	describe("console override lifecycle", () => {
		it("should NOT override console on construction alone", () => {
			// Regression guard: merely resolving/constructing a Logger must not touch global
			// console. Only an explicit startSession() call may do that (see below).
			expect(console.log).toBe(originalConsoleLog);

			expect(console.error).toBe(originalConsoleError);

			expect(console.warn).toBe(originalConsoleWarn);
		});

		it("should override console.log/error/warn once startSession() is called", () => {
			logger.startSession("Test");

			expect(console.log).not.toBe(originalConsoleLog);

			expect(console.error).not.toBe(originalConsoleError);

			expect(console.warn).not.toBe(originalConsoleWarn);
		});

		it("should restore the original console.log/error/warn when endSession() is called", () => {
			logger.startSession("Test");

			logger.endSession("Test");

			expect(console.log).toBe(originalConsoleLog);

			expect(console.error).toBe(originalConsoleError);

			expect(console.warn).toBe(originalConsoleWarn);
		});

		it("should not double-wrap console.log if startSession() is called twice", () => {
			logger.startSession("Test");

			const overriddenLog = console.log;

			logger.startSession("Test");

			expect(console.log).toBe(overriddenLog);
		});

		it("should not throw and should leave console alone if endSession() is called without a prior startSession()", () => {
			expect(() => logger.endSession("Test")).not.toThrow();

			expect(console.log).toBe(originalConsoleLog);
		});
	});

	describe("log method", () => {
		it("should exist", () => {
			expect(typeof logger.log).toBe("function");
		});
	});

	describe("error method", () => {
		it("should exist", () => {
			expect(typeof logger.error).toBe("function");
		});

		it("should write the error's stack trace to the log file, not just name and message", () => {
			const error = new Error("boom");

			logger.error("Failed migration 1: test-migration", error);

			expect(fileSystem.appendFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining(error.stack as string));
		});

		it("should fall back to name: message if the error has no stack", () => {
			const error = new Error("boom");

			delete (error as any).stack;

			logger.error("Failed migration 1: test-migration", error);

			expect(fileSystem.appendFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining("Error: boom"));
		});
	});

	describe("warn method", () => {
		it("should exist", () => {
			expect(typeof logger.warn).toBe("function");
		});
	});

	describe("startSession method", () => {
		it("should exist", () => {
			expect(typeof logger.startSession).toBe("function");
		});

		it("should call fileSystem.existsSync", () => {
			logger.startSession("TestSession");

			expect(fileSystem.existsSync).toHaveBeenCalledWith(logger.logFile);
		});

		it("should call fileSystem.mkdirSync if log directory does not exist", () => {
			fileSystem.existsSync.mockReturnValueOnce(false);

			logger.startSession("TestSession");

			expect(fileSystem.mkdirSync).toHaveBeenCalledWith(logger.logDir, {recursive: true});
		});

		it("should call fileSystem.appendFileSync if log file exists", () => {
			fileSystem.existsSync.mockReturnValueOnce(true);

			logger.startSession("TestSession");

			expect(fileSystem.appendFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining("=== TestSession started ==="));
		});

		it("should call fileSystem.writeFileSync if log file does not exist", () => {
			fileSystem.existsSync.mockReturnValueOnce(false);

			logger.startSession("TestSession");

			expect(fileSystem.writeFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining("=== TestSession started ==="));
		});
	});

	describe("endSession method", () => {
		it("should exist", () => {
			expect(typeof logger.endSession).toBe("function");
		});

		it("should call fileSystem.appendFileSync", () => {
			logger.endSession("TestSession");

			expect(fileSystem.appendFileSync).toHaveBeenCalledWith(logger.logFile, expect.stringContaining("=== TestSession completed ==="));
		});
	});

	describe("logDir path detection", () => {
		it("should use project directory when running with Node.js", () => {
			Object.defineProperty(process, "execPath", {
				value: "C:\\Program Files\\nodejs\\node.exe",
				writable: true,
				configurable: true,
			});

			delete (process as any).pkg;

			const testLogger = container.resolve(Logger);

			const expected = path.join(process.cwd(), "Logs");
			expect(testLogger.logDir).toBe(expected);
		});

		it("should use executable directory when running as compiled exe", () => {
			Object.defineProperty(process, "execPath", {
				value: "C:\\path\\to\\myapp.exe",
				writable: true,
				configurable: true,
			});

			delete (process as any).pkg;

			const testLogger = container.resolve(Logger);

			const expectedWin = path.win32.join("C:\\path\\to", "Logs");
			expect(testLogger.logDir).toBe(expectedWin);
		});

		it("should use executable directory when running as pkg compiled executable", () => {
			Object.defineProperty(process, "execPath", {
				value: "C:\\path\\to\\myapp.exe",
				writable: true,
				configurable: true,
			});

			(process as any).pkg = {};

			const testLogger = container.resolve(Logger);

			const expectedWin = path.win32.join("C:\\path\\to", "Logs");
			expect(testLogger.logDir).toBe(expectedWin);
		});

		it("should use project directory when running with ts-node", () => {
			Object.defineProperty(process, "execPath", {
				value: "C:\\Users\\username\\AppData\\Roaming\\npm\\node_modules\\ts-node\\dist\\bin.js",
				writable: true,
				configurable: true,
			});

			delete (process as any).pkg;

			const testLogger = container.resolve(Logger);

			const expected = path.join(process.cwd(), "Logs");
			expect(testLogger.logDir).toBe(expected);
		});
	});
});
