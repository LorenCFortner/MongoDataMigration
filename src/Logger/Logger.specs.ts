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

	describe("console override verification", () => {
		it("should override console.log after Logger instantiation", () => {
			const beforeOverride = console.log;

			const testLogger = container.resolve(Logger);

			expect(console.log).not.toBe(originalConsoleLog);

			console.log = beforeOverride;
		});

		it("should override console.error after Logger instantiation", () => {
			const beforeOverride = console.error;

			console.error = originalConsoleError;

			const testLogger = container.resolve(Logger);

			expect(console.error).not.toBe(originalConsoleError);

			console.error = beforeOverride;
		});

		it("should override console.warn after Logger instantiation", () => {
			const beforeOverride = console.warn;

			console.warn = originalConsoleWarn;

			const testLogger = container.resolve(Logger);

			expect(console.warn).not.toBe(originalConsoleWarn);

			console.warn = beforeOverride;
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
