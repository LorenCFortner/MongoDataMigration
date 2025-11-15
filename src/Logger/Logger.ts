import {injectable, inject, singleton} from "tsyringe";
import * as path from "path";
import {IFileSystem} from "../FileSystem/FileSystem";

export interface ILogger {
	log(message: string, ...args: any[]): void;

	error(message: string, ...args: any[]): void;

	warn(message: string, ...args: any[]): void;

	startSession(sessionName?: string): void;

	endSession(sessionName?: string): void;
}

@singleton()
@injectable()
export class Logger implements ILogger {
	public readonly logDir: string;

	public readonly logFile: string;

	private readonly originalLog: (...args: any[]) => void;

	private readonly originalError: (...args: any[]) => void;

	private readonly originalWarn: (...args: any[]) => void;

	constructor(@inject("IFileSystem") private fileSystem: IFileSystem) {
		const isCompiledExecutable = (process as any).pkg !== undefined || (!process.execPath.includes("node") && process.execPath.endsWith(".exe"));

		const isWindowsStyleExecPath = Logger.isWindowsStyleExecPath(process.execPath);

		let baseDir: string;
		if (isCompiledExecutable) {
			baseDir = isWindowsStyleExecPath ? path.win32.dirname(process.execPath) : path.dirname(process.execPath);
		} else {
			baseDir = process.cwd();
		}

		this.logDir = isCompiledExecutable && isWindowsStyleExecPath ? path.win32.join(baseDir, "Logs") : path.join(baseDir, "Logs");

		this.logFile =
			isCompiledExecutable && isWindowsStyleExecPath
				? path.win32.join(this.logDir, "MongoDataMigration.log")
				: path.join(this.logDir, "MongoDataMigration.log");

		this.originalLog = console.log.bind(console);

		this.originalError = console.error.bind(console);

		this.originalWarn = console.warn.bind(console);

		this.ensureLogDirectory();

		this.setupConsoleOverrides();
	}

	private static isWindowsStyleExecPath(execPath: string): boolean {
		// Detect if execPath is in Windows format (e.g., contains backslashes or drive letter),
		// so dirname/join use Windows semantics even when running on non-Windows (e.g., CI Linux).
		return /[\\]/.test(execPath) || /^[A-Za-z]:\\/.test(execPath) || execPath.endsWith(".exe");
	}

	private ensureLogDirectory(): void {
		if (!this.fileSystem.existsSync(this.logDir)) {
			this.fileSystem.mkdirSync(this.logDir, {recursive: true});
		}
	}

	private setupConsoleOverrides(): void {
		console.log = (...args: any[]) => {
			this.writeToConsoleAndFile("LOG", this.originalLog, args);
		};

		console.error = (...args: any[]) => {
			this.writeToConsoleAndFile("ERROR", this.originalError, args);
		};

		console.warn = (...args: any[]) => {
			this.writeToConsoleAndFile("WARN", this.originalWarn, args);
		};
	}

	private formatTimestamp(): string {
		const now = new Date();

		const year = now.getFullYear();

		const month = String(now.getMonth() + 1).padStart(2, "0");

		const day = String(now.getDate()).padStart(2, "0");

		const hours = String(now.getHours()).padStart(2, "0");

		const minutes = String(now.getMinutes()).padStart(2, "0");

		const seconds = String(now.getSeconds()).padStart(2, "0");

		const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

		const timezoneOffset = now.getTimezoneOffset();

		const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);

		const offsetMinutes = Math.abs(timezoneOffset) % 60;

		const offsetSign = timezoneOffset <= 0 ? "+" : "-";

		const offsetString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} ${offsetString}`;
	}

	private getLevelTag(level: string): string {
		switch (level.toUpperCase()) {
			case "LOG":
				return "INF";

			case "ERROR":
				return "ERR";

			case "WARN":
				return "WRN";

			default:
				return "INF";
		}
	}

	private formatArgument(arg: any): string {
		switch (true) {
			case typeof arg === "string":
				return arg;

			case arg instanceof Error:
				return `${arg.name}: ${arg.message}`;

			case typeof arg === "object" && arg !== null:
				try {
					return JSON.stringify(arg);
				} catch {
					return String(arg);
				}

			default:
				return String(arg);
		}
	}

	private writeToConsoleAndFile(level: string, originalMethod: (...args: any[]) => void, args: any[]): void {
		const message = args.map(arg => this.formatArgument(arg)).join(" ");

		const timestamp = this.formatTimestamp();

		const levelTag = this.getLevelTag(level);

		const logEntry = `${timestamp} [${levelTag}] ${message}\n`;

		originalMethod(...args);

		this.fileSystem.appendFileSync(this.logFile, logEntry);
	}

	log(message: string, ...args: any[]): void {
		this.writeToConsoleAndFile("LOG", this.originalLog, args.length > 0 ? [message, ...args] : [message]);
	}

	error(message: string, ...args: any[]): void {
		this.writeToConsoleAndFile("ERROR", this.originalError, args.length > 0 ? [message, ...args] : [message]);
	}

	warn(message: string, ...args: any[]): void {
		this.writeToConsoleAndFile("WARN", this.originalWarn, args.length > 0 ? [message, ...args] : [message]);
	}

	startSession(sessionName: string = "Migration"): void {
		const timestamp = this.formatTimestamp();

		const startMessage = `\n${timestamp} [INF] === ${sessionName} started ===\n`;

		if (this.fileSystem.existsSync(this.logFile)) {
			this.fileSystem.appendFileSync(this.logFile, startMessage);
		} else {
			this.fileSystem.writeFileSync(this.logFile, startMessage);
		}
	}

	endSession(sessionName: string = "Migration"): void {
		const timestamp = this.formatTimestamp();

		const endMessage = `${timestamp} [INF] === ${sessionName} completed ===\n\n`;

		this.fileSystem.appendFileSync(this.logFile, endMessage);
	}
}
