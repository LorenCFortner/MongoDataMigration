import * as fs from "fs";

/**
 * The real filesystem, narrowed to just the methods this codebase actually calls, and
 * injected (via DI) so tests can substitute a mock instead of touching disk.
 *
 * This used to be a ~900-line hand-written wrapper around most of Node's `fs` module,
 * almost all of it unused and some of it buggy (a `matchesGlob` that always returned
 * `false`, an `fstat` that silently dropped its `options` argument, a `readFile`/
 * `readFileSync` pair that didn't behave the same way, etc.) — because every method had
 * its own hand-written signature and implementation that could drift from what `fs`
 * actually does.
 *
 * `Pick<typeof fs, ...>` removes that risk structurally: the type comes directly from
 * Node's own `fs` typings, and the implementation below is literally the real `fs`
 * function, not a reimplementation of it. There's nothing to keep in sync and nothing to
 * get subtly wrong.
 *
 * To use a new fs method anywhere in the app:
 *   1. Add its name to the `Pick<...>` list below.
 *   2. Add one line to `FileSystem` forwarding it to the real `fs` function.
 * That's the whole change — TypeScript will immediately tell you if `fs` doesn't have a
 * method by that name, or if a caller uses it with the wrong arguments.
 */
export type IFileSystem = Pick<typeof fs, "existsSync" | "mkdirSync" | "appendFileSync" | "writeFileSync" | "readdirSync">;

export const FileSystem: IFileSystem = {
	existsSync: fs.existsSync,
	mkdirSync: fs.mkdirSync,
	appendFileSync: fs.appendFileSync,
	writeFileSync: fs.writeFileSync,
	readdirSync: fs.readdirSync,
};
