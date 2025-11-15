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

logger.startSession("GenerateRegistry");

function validateMigrationObject(obj: any, fileName: string): obj is IMigrationScript {
	try {
		const typedMigration: IMigrationScript = obj;

		return true;
	} catch (error) {
		return false;
	}
}

function createMigrationTemplate(): IMigrationScript {
	return {
		up: async () => {},
	};
}

function getInterfaceRequirements(): (keyof IMigrationScript)[] {
	const template = createMigrationTemplate();

	return Object.keys(template) as (keyof IMigrationScript)[];
}

export function extractMigrationId(fileName: string): number {
	const match = fileName.match(/^(\d+)-/);

	if (!match) {
		throw new Error(`Invalid migration filename format: ${fileName}. Expected format: "number-description.ts"`);
	}

	return parseInt(match[1], 10);
}

async function verifyMigrationImplementsInterface(
	migrationPath: string,
	fileName: string,
	importFunction: (path: string) => Promise<any> = path => import(path)
): Promise<void> {
	try {
		const migrationModule = await importFunction(migrationPath);

		const interfaceRequirements = getInterfaceRequirements();

		const migrationObject: Partial<IMigrationScript> = {};

		for (const propertyName of interfaceRequirements) {
			if (!migrationModule[propertyName]) {
				throw new Error(`Migration ${fileName} does not export required property '${propertyName}' from IMigrationScript interface`);
			}

			if (typeof migrationModule[propertyName] !== "function") {
				throw new Error(`Migration ${fileName} exports '${propertyName}' but it's not a function (required by IMigrationScript interface)`);
			}

			(migrationObject as any)[propertyName] = migrationModule[propertyName];
		}

		const validatedMigration: IMigrationScript = migrationObject as IMigrationScript;

		if (!validateMigrationObject(validatedMigration, fileName)) {
			throw new Error(`Migration ${fileName} does not conform to IMigrationScript interface`);
		}

		logger.log(`${fileName} - implements IMigrationScript correctly (verified properties: ${interfaceRequirements.join(", ")})`);
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

			return `import * as migration${index} from "./migrations/${baseName}";`;
		})
		.join("\n");

	const registryEntries = files
		.map((file, index) => {
			const baseName = path.basename(file, ".ts");

			const migrationId = extractMigrationId(file);

			const interfaceProperties = getInterfaceRequirements();

			const propertyMappings = interfaceProperties.map(prop => `\t\t${prop}: migration${index}.${prop}`).join(",\n");

			return `\t{
		id: ${migrationId},
		name: "${baseName}",
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
	const files = (fileSystemModule.readdirSync(migrationsDirectory, {withFileTypes: false}) as string[]).filter(f => /\.ts$/.test(f)).sort();

	if (files.length === 0) {
		logger.log("No migration files found.");

		return;
	}

	try {
		await verifyFunction(files, migrationsDirectory, importFunction);
	} catch (error) {
		logger.error("Migration verification failed!");

		logger.error(error instanceof Error ? error.message : String(error));

		process.exit(1);

		return;
	}

	const registryContent = generateRegistryContent(files);

	fileSystemModule.writeFileSync(outputPath, registryContent);

	logger.log(`Generated ${outputPath} with ${files.length} migrations.`);

	logger.endSession("GenerateRegistry");
}

generateRegistry().catch(error => {
	logger.error("Failed to generate migration registry:", error instanceof Error ? error.message : String(error));

	logger.endSession("GenerateRegistry");
	process.exit(1);
});
