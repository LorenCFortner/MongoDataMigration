import * as fs from "fs";
import {FileSystem, IFileSystem} from "./FileSystem";

describe("FileSystem", () => {
	it("should be defined", () => {
		expect(FileSystem).toBeDefined();
	});

	// Each method is forwarded as a direct reference to the real fs function, not a
	// reimplementation of it — so there's no behavior to drift, and no separate bug surface
	// to test. This locks that in: if a future edit ever replaces one of these with a
	// hand-written wrapper, this test catches it.
	const forwardedMethods: (keyof IFileSystem)[] = ["existsSync", "mkdirSync", "appendFileSync", "writeFileSync", "readdirSync"];

	it.each(forwardedMethods)("%s should be the real fs.%s function, not a reimplementation", methodName => {
		expect(FileSystem[methodName]).toBe(fs[methodName]);
	});

	it("should expose exactly the methods the rest of the app uses — no more", () => {
		expect(Object.keys(FileSystem).sort()).toEqual([...forwardedMethods].sort());
	});
});
