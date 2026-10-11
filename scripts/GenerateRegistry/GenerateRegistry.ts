import "reflect-metadata";
import path from "path";
import {container} from "tsyringe";
import {IMigrationScript} from "../../src/Types/Migration";
import {ILogger} from "../../src/Logger/Logger";
import {IFileSystem} from "../../src/FileSystem/FileSystem";
import "../../src/Containers/DependencyInjection";

const migrationsDir = path.join(__dirname, "..", "..", "migrations");

const registryPath = path.join(__dirname, "..", "..", "MigrationRegistryAuto.ts");

const logger = container.resolve<ILogger>("ILogger");
const fileSystem = container.resolve<IFileSystem>("IFileSystem");

// IMigrationScript currently has a single required member. This is the actual list the
// generator checks against — there's no way to derive "what properties does an interface
// require" from TypeScript at runtime, so this has to be kept in sync by hand if
// IMigrationScript ever grows a second required property.
const REQUIRED_MIGRATION_PROPERTIES: (keyof IMigrationScript)[] = ["up"];

export function extractMigrationId(fileName: string): number {
	const match = fileName.match(/^(\d+)-/);

	if (!match) {
		throw new Error(`Invalid migration filename format: ${fileName}. Expected format: "number-description.ts"`);
	}

	return parseInt(match[1], 10);
}

export function findDuplicateMigrationIds(files: string[]): Map<number, string[]> {
	const filesByMigrationId = new Map<number, string[]>();

	for (const file of files) {
		const migrationId = extractMigrationId(file);

		const filesForId = filesByMigrationId.get(migrationId) ?? [];

		filesForId.push(file);

		filesByMigrationId.set(migrationId, filesForId);
	}

	const duplicates = new Map<number, string[]>();

	for (const [migrationId, filesForId] of filesByMigrationId) {
		if (filesForId.length > 1) {
			duplicates.set(migrationId, filesForId);
		}
	}

	return duplicates;
}

export function assertNoDuplicateMigrationIds(files: string[]): void {
	const duplicates = findDuplicateMigrationIds(files);

	if (duplicates.size === 0) {
		return;
	}

	const details = Array.from(duplicates.entries())
		.map(([migrationId, filesForId]) => `  ID ${migrationId}: ${filesForId.join(", ")}`)
		.join("\n");

	throw new Error(`Duplicate migration IDs found. Each migration file must have a unique numeric ID:\n${details}`);
}

async function verifyMigrationImplementsInterface(
	migrationPath: string,
	fileName: string,
	importFunction: (path: string) => Promise<any> = path => import(path)
): Promise<void> {
	try {
		const migrationModule = await importFunction(migrationPath);

		for (const propertyName of REQUIRED_MIGRATION_PROPERTIES) {
			if (!migrationModule[propertyName]) {
				throw new Error(`Migration ${fileName} does not export required property '${propertyName}' from IMigrationScript interface`);
			}

			if (typeof migrationModule[propertyName] !== "function") {
				throw new Error(`Migration ${fileName} exports '${propertyName}' but it's not a function (required by IMigrationScript interface)`);
			}
		}

		logger.log(`${fileName} - implements IMigrationScript correctly (verified properties: ${REQUIRED_MIGRATION_PROPERTIES.join(", ")})`);
	} catch (error) {
		throw new Error(`Migration verification failed for ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export async function verifyAllMigrations(
	files: string[],
	migrationsDirectory: string,
	importFunction: (path: string) => Promise<any> = path => import(path)
): Promise<void> {
	logger.log("\nVerifying migrations implement IMigrationScript...\n");

	for (const file of files) {
		const fileName = path.basename(file, ".ts");

		const migrationPath = path.resolve(migrationsDirectory, file);

		await verifyMigrationImplementsInterface(migrationPath, fileName, importFunction);
	}

	logger.log(`\nAll ${files.length} migrations verified successfully!\n`);
}

export function generateRegistryContent(files: string[]): string {
	if (files.length === 0) {
		return "";
	}

	const imports = files
		.map((file, index) => {
			const baseName = path.basename(file, ".ts");

			// JSON.stringify produces a properly escaped string literal (quotes, backslashes,
			// etc.), unlike interpolating the raw filename straight into a template string.
			return `import * as migration${index} from ${JSON.stringify(`./migrations/${baseName}`)};`;
		})
		.join("\n");

	const registryEntries = files
		.map((file, index) => {
			const baseName = path.basename(file, ".ts");

			const migrationId = extractMigrationId(file);

			const propertyMappings = REQUIRED_MIGRATION_PROPERTIES.map(prop => `\t\t${prop}: migration${index}.${prop}`).join(",\n");

			return `\t{
		id: ${migrationId},
		name: ${JSON.stringify(baseName)},
${propertyMappings}
	}`;
		})
		.join(",\n");

	return `import { IMigrationScript } from "./src/Types/Migration";

export interface Migration extends IMigrationScript {
	id: number;
	name: string;
}

${imports}

export const migrationRegistry: Migration[] = [
${registryEntries}
].sort((a, b) => a.id - b.id);

export const migrationCount = ${files.length};
`;
}

export async function generateRegistry(
	migrationsDirectory: string = migrationsDir,
	outputPath: string = registryPath,
	fileSystemModule: IFileSystem = fileSystem,
	verifyFunction: typeof verifyAllMigrations = verifyAllMigrations,
	importFunction: (path: string) => Promise<any> = path => import(path)
): Promise<void> {
	// Everything below is wrapped so endSession() always runs exactly once — on the
	// empty-migrations early return, on a thrown error, or on success — not just on the
	// success path. Logger ties restoring the hijacked console.log/error/warn to
	// endSession(), so skipping it on any path leaves console overridden indefinitely.
	try {
		const files = (fileSystemModule.readdirSync(migrationsDirectory, {withFileTypes: false}) as string[]).filter(f => /\.ts$/.test(f)).sort();

		if (files.length === 0) {
			logger.log("No migration files found.");

			return;
		}

		try {
			assertNoDuplicateMigrationIds(files);
		} catch (error) {
			logger.error("Migration generation failed!");

			logger.error(error instanceof Error ? error.message : String(error));

			throw error;
		}

		try {
			await verifyFunction(files, migrationsDirectory, importFunction);
		} catch (error) {
			logger.error("Migration verification failed!");

			logger.error(error instanceof Error ? error.message : String(error));

			throw error;
		}

		const registryContent = generateRegistryContent(files);

		fileSystemModule.writeFileSync(outputPath, registryContent);

		logger.log(`Generated ${outputPath} with ${files.length} migrations.`);
	} finally {
		logger.endSession("GenerateRegistry");
	}
}

// Only run as a CLI entry point (`node GenerateRegistry.js` / `ts-node GenerateRegistry.ts`),
// never just from being imported — e.g. by GenerateRegistry.specs.ts, or by anything else
// that imports the exported functions above. Without this guard, importing this file for
// its exports triggers a real registry generation (and a real process.exit(1) on failure)
// as a side effect of the import itself.
if (require.main === module) {
	logger.startSession("GenerateRegistry");

	generateRegistry().catch(error => {
		// generateRegistry() already called endSession() itself (in its own finally) before
		// this rejection reached here — don't call it a second time.
		logger.error("Failed to generate migration registry:", error instanceof Error ? error.message : String(error));

		process.exit(1);
	});
}
