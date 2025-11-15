/**
 * FileSystem Service
 *
 * This class was auto-generated to wrap the Node.js "fs" module in order to have cleaner unit testing.
 * By wrapping fs operations in a dependency-injectable service, we can easily mock file system
 * operations in tests without touching the actual file system.
 *
 * This enables:
 * - Complete test isolation
 * - Faster test execution
 * - Predictable test behavior
 * - Better error testing scenarios
 */

import * as fs from "fs";
import * as path from "path";
import {injectable} from "tsyringe";

export interface IFileSystem {
	// File read/write operations
	readFileAsync(filePath: string, encoding?: BufferEncoding): Promise<string>;
	readFileAsync(filePath: string, options?: {encoding?: BufferEncoding; flag?: string}): Promise<string | Buffer>;
	readFile(filePath: string, encoding?: BufferEncoding): string;
	readFileSync(filePath: string, options?: {encoding?: BufferEncoding; flag?: string} | BufferEncoding): string | Buffer;
	writeFile(filePath: string, data: string, encoding?: BufferEncoding): void;
	writeFileSync(filePath: string, data: string | Buffer, options?: {encoding?: BufferEncoding; mode?: number; flag?: string} | BufferEncoding): void;
	appendFile(filePath: string, data: string | Buffer, options?: {encoding?: BufferEncoding; mode?: number; flag?: string} | BufferEncoding): Promise<void>;
	appendFileSync(filePath: string, data: string | Buffer, options?: {encoding?: BufferEncoding; mode?: number; flag?: string} | BufferEncoding): void;

	// File operations
	copyFile(src: string, dest: string, mode?: number): Promise<void>;
	copyFileSync(src: string, dest: string, mode?: number): void;
	cp(
		src: string,
		dest: string,
		options?: {
			dereference?: boolean;
			errorOnExist?: boolean;
			filter?: (src: string, dest: string) => boolean;
			force?: boolean;
			preserveTimestamps?: boolean;
			recursive?: boolean;
		}
	): Promise<void>;
	cpSync(
		src: string,
		dest: string,
		options?: {
			dereference?: boolean;
			errorOnExist?: boolean;
			filter?: (src: string, dest: string) => boolean;
			force?: boolean;
			preserveTimestamps?: boolean;
			recursive?: boolean;
		}
	): void;
	rename(oldPath: string, newPath: string): Promise<void>;
	renameSync(oldPath: string, newPath: string): void;
	unlink(filePath: string): Promise<void>;
	unlinkSync(filePath: string): void;
	truncate(filePath: string, len?: number): Promise<void>;
	truncateSync(filePath: string, len?: number): void;
	ftruncate(fd: number, len?: number): Promise<void>;
	ftruncateSync(fd: number, len?: number): void;
	fsync(fd: number): Promise<void>;
	fsyncSync(fd: number): void;
	fdatasync(fd: number): Promise<void>;
	fdatasyncSync(fd: number): void;

	// File system checks
	exists(filePath: string): Promise<boolean>;
	existsSync(filePath: string): boolean;
	access(filePath: string, mode?: number): Promise<void>;
	accessSync(filePath: string, mode?: number): void;

	// File stats and information
	stat(filePath: string, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): Promise<fs.Stats | fs.BigIntStats>;
	statSync(filePath: string, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): fs.Stats | fs.BigIntStats;
	fstat(fd: number, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): Promise<fs.Stats | fs.BigIntStats>;
	fstatSync(fd: number, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): fs.Stats | fs.BigIntStats;
	lstat(filePath: string, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): Promise<fs.Stats | fs.BigIntStats>;
	lstatSync(filePath: string, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): fs.Stats | fs.BigIntStats;
	realpath(filePath: string, options?: {encoding?: BufferEncoding}): Promise<string>;
	realpathSync(filePath: string, options?: {encoding?: BufferEncoding}): string;
	statfs(path: string, options?: {bigint?: boolean}): Promise<fs.StatsFs | fs.BigIntStatsFs>;
	statfsSync(path: string, options?: {bigint?: boolean}): fs.StatsFs | fs.BigIntStatsFs;

	// Directory operations
	mkdir(dirPath: string, options?: {recursive?: boolean; mode?: number} | number): Promise<void | string>;
	mkdirSync(dirPath: string, options?: {recursive?: boolean; mode?: number} | number): void | string;
	rmdir(dirPath: string, options?: {maxRetries?: number; recursive?: boolean; retryDelay?: number}): Promise<void>;
	rmdirSync(dirPath: string, options?: {maxRetries?: number; recursive?: boolean; retryDelay?: number}): void;
	rm(dirPath: string, options?: {force?: boolean; maxRetries?: number; recursive?: boolean; retryDelay?: number}): Promise<void>;
	rmSync(dirPath: string, options?: {force?: boolean; maxRetries?: number; recursive?: boolean; retryDelay?: number}): void;
	mkdtemp(prefix: string, options?: {encoding?: BufferEncoding}): Promise<string>;
	mkdtempSync(prefix: string, options?: {encoding?: BufferEncoding}): string;
	readdir(dirPath: string, options?: {encoding?: BufferEncoding; withFileTypes?: boolean}): Promise<string[] | fs.Dirent[]>;
	readdirSync(dirPath: string, options?: {encoding?: BufferEncoding; withFileTypes?: boolean}): string[] | fs.Dirent[];
	opendir(dirPath: string, options?: {encoding?: BufferEncoding; bufferSize?: number}): Promise<fs.Dir>;
	opendirSync(dirPath: string, options?: {encoding?: BufferEncoding; bufferSize?: number}): fs.Dir;

	// Links
	link(existingPath: string, newPath: string): Promise<void>;
	linkSync(existingPath: string, newPath: string): void;
	symlink(target: string, path: string, type?: fs.symlink.Type): Promise<void>;
	symlinkSync(target: string, path: string, type?: fs.symlink.Type): void;
	readlink(path: string, options?: {encoding?: BufferEncoding}): Promise<string>;
	readlinkSync(path: string, options?: {encoding?: BufferEncoding}): string;

	// Permissions
	chmod(path: string, mode: fs.Mode): Promise<void>;
	chmodSync(path: string, mode: fs.Mode): void;
	fchmod(fd: number, mode: fs.Mode): Promise<void>;
	fchmodSync(fd: number, mode: fs.Mode): void;
	chown(path: string, uid: number, gid: number): Promise<void>;
	chownSync(path: string, uid: number, gid: number): void;
	fchown(fd: number, uid: number, gid: number): Promise<void>;
	fchownSync(fd: number, uid: number, gid: number): void;
	lchown(path: string, uid: number, gid: number): Promise<void>;
	lchownSync(path: string, uid: number, gid: number): void;

	// Low-level file operations
	open(path: string, flags: string | number, mode?: fs.Mode): Promise<number>;
	openSync(path: string, flags: string | number, mode?: fs.Mode): number;
	close(fd: number): Promise<void>;
	closeSync(fd: number): void;
	read(fd: number, buffer: Buffer, offset: number, length: number, position: number | null): Promise<{bytesRead: number; buffer: Buffer}>;
	readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number | null): number;
	readv(fd: number, buffers: readonly Buffer[], position?: number): Promise<{bytesRead: number; buffers: Buffer[]}>;
	readvSync(fd: number, buffers: readonly Buffer[], position?: number): number;
	write(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number): Promise<{bytesWritten: number; buffer: Buffer}>;
	write(fd: number, string: string, position?: number, encoding?: BufferEncoding): Promise<{bytesWritten: number; buffer: string}>;
	writeSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number): number;
	writeSync(fd: number, string: string, position?: number, encoding?: BufferEncoding): number;
	writev(fd: number, buffers: readonly Buffer[], position?: number): Promise<{bytesWritten: number; buffers: Buffer[]}>;
	writevSync(fd: number, buffers: readonly Buffer[], position?: number): number;
	futimes(fd: number, atime: fs.TimeLike, mtime: fs.TimeLike): Promise<void>;
	futimesSync(fd: number, atime: fs.TimeLike, mtime: fs.TimeLike): void;
	lutimes(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): Promise<void>;
	lutimesSync(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): void;
	utimes(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): Promise<void>;
	utimesSync(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): void;

	// File watching
	watchFile(filename: string, options: fs.WatchFileOptions, listener: (curr: fs.Stats, prev: fs.Stats) => void): fs.StatWatcher;
	watchFile(filename: string, listener: (curr: fs.Stats, prev: fs.Stats) => void): fs.StatWatcher;
	unwatchFile(filename: string, listener?: (curr: fs.Stats, prev: fs.Stats) => void): void;
	watch(filename: string, options?: {encoding?: BufferEncoding; persistent?: boolean; recursive?: boolean}): fs.FSWatcher;

	// Additional async methods
	glob(pattern: string, options?: {cwd?: string; exclude?: (path: string) => boolean}): Promise<string[]>;
	globSync(pattern: string, options?: {cwd?: string; exclude?: (path: string) => boolean}): string[];
	openAsBlob(path: string, options?: {type?: string}): Promise<Blob>;

	// fs classes and constructors (for completeness)
	Dirent: typeof fs.Dirent;
	Stats: typeof fs.Stats;
	ReadStream: typeof fs.ReadStream;
	WriteStream: typeof fs.WriteStream;
	FileReadStream: typeof fs.ReadStream;
	FileWriteStream: typeof fs.WriteStream;
	Dir: typeof fs.Dir;
	watch(filename: string, options: {encoding: "buffer"; persistent?: boolean; recursive?: boolean}): fs.FSWatcher;
	watch(filename: string, listener?: fs.WatchListener<string>): fs.FSWatcher;

	// Streams
	createReadStream(
		path: string,
		options?:
			| string
			| {
					flags?: string;
					encoding?: BufferEncoding;
					fd?: number;
					mode?: number;
					autoClose?: boolean;
					emitClose?: boolean;
					start?: number;
					end?: number;
					highWaterMark?: number;
			  }
	): fs.ReadStream;
	createWriteStream(
		path: string,
		options?:
			| string
			| {
					flags?: string;
					encoding?: BufferEncoding;
					fd?: number;
					mode?: number;
					autoClose?: boolean;
					emitClose?: boolean;
					start?: number;
					highWaterMark?: number;
			  }
	): fs.WriteStream;

	// Path operations
	join(...paths: string[]): string;
	resolve(...paths: string[]): string;
	relative(from: string, to: string): string;
	dirname(filePath: string): string;
	basename(filePath: string, ext?: string): string;
	extname(filePath: string): string;
	parse(filePath: string): path.ParsedPath;
	format(pathObject: path.FormatInputPathObject): string;
	isAbsolute(filePath: string): boolean;
	normalize(filePath: string): string;
	toNamespacedPath(path: string): string;

	// Glob operations
	matchesGlob(path: string, pattern: string): boolean;

	// JSON operations (convenience methods)
	readJsonSync(filePath: string): any;
	writeJsonSync(filePath: string, data: any, space?: string | number): void;

	// Constants
	readonly constants: typeof fs.constants;
}

@injectable()
class FileSystem implements IFileSystem {
	// File async operations
	readFileAsync(filePath: string, encoding?: BufferEncoding): Promise<string>;
	readFileAsync(filePath: string, options?: {encoding?: BufferEncoding; flag?: string}): Promise<string | Buffer>;
	async readFileAsync(filePath: string, options?: BufferEncoding | {encoding?: BufferEncoding; flag?: string}): Promise<string | Buffer> {
		return fs.promises.readFile(filePath, options as any);
	}

	// File sync operations
	readFile(filePath: string, encoding: BufferEncoding = "utf-8"): string {
		return fs.readFileSync(filePath, encoding);
	}

	readFileSync(filePath: string, options?: {encoding?: BufferEncoding; flag?: string} | BufferEncoding): string | Buffer {
		return fs.readFileSync(filePath, options as any);
	}

	writeFile(filePath: string, data: string, encoding: BufferEncoding = "utf-8"): void {
		fs.writeFileSync(filePath, data, encoding);
	}

	writeFileSync(filePath: string, data: string | Buffer, options?: {encoding?: BufferEncoding; mode?: number; flag?: string} | BufferEncoding): void {
		fs.writeFileSync(filePath, data, options as any);
	}

	async appendFile(
		filePath: string,
		data: string | Buffer,
		options?: {encoding?: BufferEncoding; mode?: number; flag?: string} | BufferEncoding
	): Promise<void> {
		return fs.promises.appendFile(filePath, data, options as any);
	}

	appendFileSync(filePath: string, data: string | Buffer, options?: {encoding?: BufferEncoding; mode?: number; flag?: string} | BufferEncoding): void {
		fs.appendFileSync(filePath, data, options as any);
	}

	// Async file operations
	async writeFileAsync(
		filePath: string,
		data: string | Buffer,
		options?: {encoding?: BufferEncoding; mode?: number; flag?: string} | BufferEncoding
	): Promise<void> {
		return fs.promises.writeFile(filePath, data, options as any);
	}

	async copyFile(src: string, dest: string, mode?: number): Promise<void> {
		return fs.promises.copyFile(src, dest, mode);
	}

	async cp(
		src: string,
		dest: string,
		options?: {
			dereference?: boolean;
			errorOnExist?: boolean;
			filter?: (src: string, dest: string) => boolean;
			force?: boolean;
			preserveTimestamps?: boolean;
			recursive?: boolean;
		}
	): Promise<void> {
		return fs.promises.cp(src, dest, options);
	}

	async rename(oldPath: string, newPath: string): Promise<void> {
		return fs.promises.rename(oldPath, newPath);
	}

	async unlink(path: string): Promise<void> {
		return fs.promises.unlink(path);
	}

	async truncate(path: string, length?: number): Promise<void> {
		return fs.promises.truncate(path, length);
	}

	async ftruncate(fd: number, length?: number): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.ftruncate(fd, length ?? 0, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async fsync(fd: number): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.fsync(fd, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async fdatasync(fd: number): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.fdatasync(fd, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async exists(path: string): Promise<boolean> {
		try {
			await fs.promises.access(path);
			return true;
		} catch {
			return false;
		}
	}

	async access(path: string, mode?: number): Promise<void> {
		return fs.promises.access(path, mode);
	}

	async stat(path: string, options?: {bigint?: boolean}): Promise<fs.Stats | fs.BigIntStats> {
		return fs.promises.stat(path, options as any);
	}

	async fstat(fd: number): Promise<fs.Stats> {
		return new Promise((resolve, reject) => {
			fs.fstat(fd, (err, stats) => {
				if (err) reject(err);
				else resolve(stats);
			});
		});
	}

	async lstat(path: string, options?: {bigint?: boolean}): Promise<fs.Stats | fs.BigIntStats> {
		return fs.promises.lstat(path, options as any);
	}

	async realpath(path: string, options?: {encoding?: BufferEncoding}): Promise<string> {
		return fs.promises.realpath(path, options as any);
	}

	async statfs(path: string, options?: {bigint?: boolean}): Promise<fs.StatsFs | fs.BigIntStatsFs> {
		return (fs.promises as any).statfs(path, options);
	}

	// Directory operations
	async mkdir(dirPath: string, options?: {recursive?: boolean; mode?: number} | number): Promise<void | string> {
		return fs.promises.mkdir(dirPath, options as any);
	}

	async rmdir(dirPath: string, options?: {maxRetries?: number; recursive?: boolean; retryDelay?: number}): Promise<void> {
		return fs.promises.rmdir(dirPath, options as any);
	}

	async rm(dirPath: string, options?: {force?: boolean; maxRetries?: number; recursive?: boolean; retryDelay?: number}): Promise<void> {
		return fs.promises.rm(dirPath, options as any);
	}

	async mkdtemp(prefix: string, options?: {encoding?: BufferEncoding}): Promise<string> {
		return fs.promises.mkdtemp(prefix, options as any);
	}

	async readdir(dirPath: string, options?: {encoding?: BufferEncoding; withFileTypes?: boolean}): Promise<string[] | fs.Dirent[]> {
		return fs.promises.readdir(dirPath, options as any);
	}

	async opendir(dirPath: string, options?: {encoding?: BufferEncoding; bufferSize?: number}): Promise<fs.Dir> {
		return fs.promises.opendir(dirPath, options as any);
	}

	// Links
	async link(existingPath: string, newPath: string): Promise<void> {
		return fs.promises.link(existingPath, newPath);
	}

	async symlink(target: string, path: string, type?: fs.symlink.Type): Promise<void> {
		return fs.promises.symlink(target, path, type);
	}

	async readlink(path: string, options?: {encoding?: BufferEncoding}): Promise<string> {
		return fs.promises.readlink(path, options as any);
	}

	// Permissions
	async chmod(path: string, mode: fs.Mode): Promise<void> {
		return fs.promises.chmod(path, mode);
	}

	async fchmod(fd: number, mode: fs.Mode): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.fchmod(fd, mode, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async chown(path: string, uid: number, gid: number): Promise<void> {
		return fs.promises.chown(path, uid, gid);
	}

	async fchown(fd: number, uid: number, gid: number): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.fchown(fd, uid, gid, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async lchown(path: string, uid: number, gid: number): Promise<void> {
		return fs.promises.lchown(path, uid, gid);
	}

	// Low-level file operations
	async open(path: string, flags: string | number, mode?: fs.Mode): Promise<number> {
		return new Promise((resolve, reject) => {
			fs.open(path, flags, mode, (err, fd) => {
				if (err) reject(err);
				else resolve(fd);
			});
		});
	}

	async close(fd: number): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.close(fd, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async read(fd: number, buffer: Buffer, offset: number, length: number, position: number | null): Promise<{bytesRead: number; buffer: Buffer}> {
		return new Promise((resolve, reject) => {
			fs.read(fd, buffer, offset, length, position, (err, bytesRead, buf) => {
				if (err) reject(err);
				else resolve({bytesRead, buffer: buf});
			});
		});
	}

	async readv(fd: number, buffers: readonly Buffer[], position?: number): Promise<{bytesRead: number; buffers: Buffer[]}> {
		return new Promise((resolve, reject) => {
			fs.readv(fd, buffers as Buffer[], position ?? null, (err, bytesRead, bufs) => {
				if (err) reject(err);
				else resolve({bytesRead, buffers: bufs as Buffer[]});
			});
		});
	}

	async write(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number): Promise<{bytesWritten: number; buffer: Buffer}>;
	async write(fd: number, string: string, position?: number, encoding?: BufferEncoding): Promise<{bytesWritten: number; buffer: string}>;
	async write(
		fd: number,
		data: Buffer | string,
		offsetOrPosition?: number,
		lengthOrEncodingOrPosition?: number | BufferEncoding,
		position?: number
	): Promise<{bytesWritten: number; buffer: Buffer | string}> {
		return new Promise((resolve, reject) => {
			if (typeof data === "string") {
				fs.write(fd, data, offsetOrPosition as number, lengthOrEncodingOrPosition as BufferEncoding, (err, written, str) => {
					if (err) reject(err);
					else resolve({bytesWritten: written, buffer: str});
				});
			} else {
				fs.write(fd, data, offsetOrPosition as number, lengthOrEncodingOrPosition as number, position, (err, written, buf) => {
					if (err) reject(err);
					else resolve({bytesWritten: written, buffer: buf});
				});
			}
		});
	}

	async writev(fd: number, buffers: readonly Buffer[], position?: number): Promise<{bytesWritten: number; buffers: Buffer[]}> {
		return new Promise((resolve, reject) => {
			fs.writev(fd, buffers as Buffer[], position ?? null, (err, bytesWritten, bufs) => {
				if (err) reject(err);
				else resolve({bytesWritten, buffers: bufs as Buffer[]});
			});
		});
	}

	async futimes(fd: number, atime: fs.TimeLike, mtime: fs.TimeLike): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.futimes(fd, atime, mtime, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async lutimes(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): Promise<void> {
		return fs.promises.lutimes(path, atime, mtime);
	}

	async utimes(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): Promise<void> {
		return fs.promises.utimes(path, atime, mtime);
	}

	// Additional async methods
	async glob(pattern: string, options?: {cwd?: string; exclude?: (path: string) => boolean}): Promise<string[]> {
		return new Promise((resolve, reject) => {
			const opts = {...options, withFileTypes: false};
			fs.glob(pattern, opts as any, (err, matches) => {
				if (err) reject(err);
				else {
					// Ensure we return string[] not Dirent[]
					const stringMatches = Array.isArray(matches) ? matches.map(m => (typeof m === "string" ? m : m.toString())) : [];
					resolve(stringMatches);
				}
			});
		});
	}

	async openAsBlob(path: string, options?: {type?: string}): Promise<Blob> {
		// Note: openAsBlob may not be available in all Node.js versions
		if ("openAsBlob" in fs.promises) {
			return (fs.promises as any).openAsBlob(path, options);
		} else {
			throw new Error("openAsBlob is not available in this Node.js version");
		}
	}

	// fs classes and constructors (for completeness)
	Dirent = fs.Dirent;
	Stats = fs.Stats;
	ReadStream = fs.ReadStream;
	WriteStream = fs.WriteStream;
	FileReadStream = fs.ReadStream;
	FileWriteStream = fs.WriteStream;
	Dir = fs.Dir;

	// File operations
	copyFileSync(src: string, dest: string, mode?: number): void {
		fs.copyFileSync(src, dest, mode);
	}

	cpSync(
		src: string,
		dest: string,
		options?: {
			dereference?: boolean;
			errorOnExist?: boolean;
			filter?: (src: string, dest: string) => boolean;
			force?: boolean;
			preserveTimestamps?: boolean;
			recursive?: boolean;
		}
	): void {
		fs.cpSync(src, dest, options as any);
	}

	renameSync(oldPath: string, newPath: string): void {
		fs.renameSync(oldPath, newPath);
	}

	unlinkSync(filePath: string): void {
		fs.unlinkSync(filePath);
	}

	truncateSync(filePath: string, len?: number): void {
		fs.truncateSync(filePath, len);
	}

	ftruncateSync(fd: number, len?: number): void {
		fs.ftruncateSync(fd, len);
	}

	fsyncSync(fd: number): void {
		fs.fsyncSync(fd);
	}

	fdatasyncSync(fd: number): void {
		fs.fdatasyncSync(fd);
	}

	// File system checks
	existsSync(filePath: string): boolean {
		return fs.existsSync(filePath);
	}

	accessSync(filePath: string, mode?: number): void {
		fs.accessSync(filePath, mode);
	}

	// File stats and information
	statSync(filePath: string, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): fs.Stats | fs.BigIntStats {
		return fs.statSync(filePath, options as any);
	}

	fstatSync(fd: number, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): fs.Stats | fs.BigIntStats {
		return fs.fstatSync(fd, options as any);
	}

	lstatSync(filePath: string, options?: {bigint?: boolean; throwIfNoEntry?: boolean}): fs.Stats | fs.BigIntStats {
		return fs.lstatSync(filePath, options as any);
	}

	realpathSync(filePath: string, options?: {encoding?: BufferEncoding}): string {
		return fs.realpathSync(filePath, options as any);
	}

	statfsSync(path: string, options?: {bigint?: boolean}): fs.StatsFs | fs.BigIntStatsFs {
		return fs.statfsSync(path, options as any);
	}

	// Directory operations
	mkdirSync(dirPath: string, options?: {recursive?: boolean; mode?: number} | number): void | string {
		return fs.mkdirSync(dirPath, options as any);
	}

	rmdirSync(dirPath: string, options?: {maxRetries?: number; recursive?: boolean; retryDelay?: number}): void {
		fs.rmdirSync(dirPath, options as any);
	}

	rmSync(dirPath: string, options?: {force?: boolean; maxRetries?: number; recursive?: boolean; retryDelay?: number}): void {
		fs.rmSync(dirPath, options as any);
	}

	mkdtempSync(prefix: string, options?: {encoding?: BufferEncoding}): string {
		return fs.mkdtempSync(prefix, options as any);
	}

	readdirSync(dirPath: string, options?: {encoding?: BufferEncoding; withFileTypes?: boolean}): string[] | fs.Dirent[] {
		return fs.readdirSync(dirPath, options as any);
	}

	opendirSync(dirPath: string, options?: {encoding?: BufferEncoding; bufferSize?: number}): fs.Dir {
		return fs.opendirSync(dirPath, options as any);
	}

	// Links
	linkSync(existingPath: string, newPath: string): void {
		fs.linkSync(existingPath, newPath);
	}

	symlinkSync(target: string, path: string, type?: fs.symlink.Type): void {
		fs.symlinkSync(target, path, type);
	}

	readlinkSync(path: string, options?: {encoding?: BufferEncoding}): string {
		return fs.readlinkSync(path, options as any);
	}

	// Permissions
	chmodSync(path: string, mode: fs.Mode): void {
		fs.chmodSync(path, mode);
	}

	fchmodSync(fd: number, mode: fs.Mode): void {
		fs.fchmodSync(fd, mode);
	}

	chownSync(path: string, uid: number, gid: number): void {
		fs.chownSync(path, uid, gid);
	}

	fchownSync(fd: number, uid: number, gid: number): void {
		fs.fchownSync(fd, uid, gid);
	}

	lchownSync(path: string, uid: number, gid: number): void {
		fs.lchownSync(path, uid, gid);
	}

	// Low-level file operations
	openSync(path: string, flags: string | number, mode?: fs.Mode): number {
		return fs.openSync(path, flags, mode);
	}

	closeSync(fd: number): void {
		fs.closeSync(fd);
	}

	readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number | null): number {
		return fs.readSync(fd, buffer, offset, length, position);
	}

	readvSync(fd: number, buffers: readonly Buffer[], position?: number): number {
		return fs.readvSync(fd, buffers, position);
	}

	writeSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number): number;
	writeSync(fd: number, string: string, position?: number, encoding?: BufferEncoding): number;
	writeSync(fd: number, data: Buffer | string, offsetOrPosition?: number, lengthOrEncoding?: number | BufferEncoding, position?: number): number {
		if (typeof data === "string") {
			return fs.writeSync(fd, data, offsetOrPosition, lengthOrEncoding as BufferEncoding);
		} else {
			return fs.writeSync(fd, data, offsetOrPosition, lengthOrEncoding as number, position);
		}
	}

	writevSync(fd: number, buffers: readonly Buffer[], position?: number): number {
		return fs.writevSync(fd, buffers, position);
	}

	futimesSync(fd: number, atime: fs.TimeLike, mtime: fs.TimeLike): void {
		fs.futimesSync(fd, atime, mtime);
	}

	lutimesSync(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): void {
		fs.lutimesSync(path, atime, mtime);
	}

	utimesSync(path: string, atime: fs.TimeLike, mtime: fs.TimeLike): void {
		fs.utimesSync(path, atime, mtime);
	}

	// File watching
	watchFile(filename: string, options: fs.WatchFileOptions, listener: (curr: fs.Stats, prev: fs.Stats) => void): fs.StatWatcher;
	watchFile(filename: string, listener: (curr: fs.Stats, prev: fs.Stats) => void): fs.StatWatcher;
	watchFile(
		filename: string,
		optionsOrListener: fs.WatchFileOptions | ((curr: fs.Stats, prev: fs.Stats) => void),
		listener?: (curr: fs.Stats, prev: fs.Stats) => void
	): fs.StatWatcher {
		if (typeof optionsOrListener === "function") {
			return fs.watchFile(filename, optionsOrListener);
		} else {
			return fs.watchFile(filename, optionsOrListener as any, listener!);
		}
	}

	unwatchFile(filename: string, listener?: (curr: fs.Stats, prev: fs.Stats) => void): void {
		fs.unwatchFile(filename, listener);
	}

	watch(filename: string, options?: {encoding?: BufferEncoding; persistent?: boolean; recursive?: boolean}): fs.FSWatcher;
	watch(filename: string, options: {encoding: "buffer"; persistent?: boolean; recursive?: boolean}): fs.FSWatcher;
	watch(filename: string, listener?: fs.WatchListener<string>): fs.FSWatcher;
	watch(filename: string, optionsOrListener?: any, listener?: fs.WatchListener<string>): fs.FSWatcher {
		if (typeof optionsOrListener === "function") {
			return fs.watch(filename, optionsOrListener);
		} else {
			return fs.watch(filename, optionsOrListener, listener);
		}
	}

	// Streams
	createReadStream(
		path: string,
		options?:
			| string
			| {
					flags?: string;
					encoding?: BufferEncoding;
					fd?: number;
					mode?: number;
					autoClose?: boolean;
					emitClose?: boolean;
					start?: number;
					end?: number;
					highWaterMark?: number;
			  }
	): fs.ReadStream {
		return fs.createReadStream(path, options as any);
	}

	createWriteStream(
		path: string,
		options?:
			| string
			| {
					flags?: string;
					encoding?: BufferEncoding;
					fd?: number;
					mode?: number;
					autoClose?: boolean;
					emitClose?: boolean;
					start?: number;
					highWaterMark?: number;
			  }
	): fs.WriteStream {
		return fs.createWriteStream(path, options as any);
	}

	// Path operations
	join(...paths: string[]): string {
		return path.join(...paths);
	}

	resolve(...paths: string[]): string {
		return path.resolve(...paths);
	}

	relative(from: string, to: string): string {
		return path.relative(from, to);
	}

	dirname(filePath: string): string {
		return path.dirname(filePath);
	}

	basename(filePath: string, ext?: string): string {
		return path.basename(filePath, ext);
	}

	extname(filePath: string): string {
		return path.extname(filePath);
	}

	parse(filePath: string): path.ParsedPath {
		return path.parse(filePath);
	}

	format(pathObject: path.FormatInputPathObject): string {
		return path.format(pathObject);
	}

	isAbsolute(filePath: string): boolean {
		return path.isAbsolute(filePath);
	}

	normalize(filePath: string): string {
		return path.normalize(filePath);
	}

	toNamespacedPath(filePath: string): string {
		return path.toNamespacedPath(filePath);
	}

	// Glob operations
	globSync(pattern: string, options?: {cwd?: string; exclude?: (path: string) => boolean}): string[] {
		const opts = {...options, withFileTypes: false};
		const result = fs.globSync(pattern, opts as any);
		// Ensure we return string[] not Dirent[]
		return Array.isArray(result) ? result.map(m => (typeof m === "string" ? m : m.toString())) : [];
	}

	matchesGlob(filePath: string, pattern: string): boolean {
		// Use a simple implementation or a library like minimatch
		// For now, just return false as a placeholder
		return false;
	}

	// JSON operations (convenience methods)
	readJsonSync(filePath: string): any {
		const content = this.readFile(filePath);
		return JSON.parse(content);
	}

	writeJsonSync(filePath: string, data: any, space: string | number = 2): void {
		const content = JSON.stringify(data, null, space);
		this.writeFile(filePath, content);
	}

	// Constants
	get constants(): typeof fs.constants {
		return fs.constants;
	}
}

export {FileSystem};
