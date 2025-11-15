# MongoDataMigration

A TypeScript-based MongoDB migration tool for managing database schema and data changes over time.

## Overview

MongoDataMigration runs TypeScript migration files in sequential order to evolve your MongoDB database as your data shape changes. Migrations are executed only once and tracked in the database to prevent re-execution.

## Features

- **Sequential Execution**: Migrations run in order based on their numeric ID
- **Idempotent**: Each migration runs only once; the system tracks which migrations have been applied
- **TypeScript Support**: Write migrations in TypeScript with full type safety
- **Auto-Generated Registry**: Migration registry is automatically generated from the `migrations/` folder
- **Logging**: Comprehensive logging to both console and file
- **Executable Build**: Can be compiled to a standalone `.exe` for deployment

## Installation

```bash
npm install
```

## Project Structure

```
migrations/           # Migration files (e.g., 0001-addTestData.ts)
src/
  index.ts           # Application entry point
  Runner/            # Migration execution logic
  Mongo/             # MongoDB connection management
  Logger/            # Logging functionality
  Types/             # TypeScript interfaces
scripts/
  GenerateRegistry/  # Auto-generates migration registry
```

## Writing Migrations

Migrations are TypeScript files placed in the `migrations/` directory. They must follow the naming convention:

```
XXXX-description.ts
```

Where `XXXX` is a zero-padded numeric ID (e.g., `0001`, `0002`, `0013`).

### Migration Template

Each migration must export an `up` function that implements the `IMigrationScript` interface:

```typescript
import {Db} from "mongodb";
import {IMigrationScript} from "../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db): Promise<void> => {
	const collection = db.collection("YourCollection");

	// Your migration logic here
	await collection.updateMany({}, {$set: {newField: "defaultValue"}});
};
```

### Migration Examples

**Example 1: Adding documents**

```typescript
export const up: IMigrationScript["up"] = async (db: Db): Promise<void> => {
	const collection = db.collection("Users");

	await collection.insertMany([
		{name: "John Doe", email: "john@example.com"},
		{name: "Jane Smith", email: "jane@example.com"},
	]);
};
```

**Example 2: Updating schema**

```typescript
export const up: IMigrationScript["up"] = async (db: Db): Promise<void> => {
	const collection = db.collection("Products");

	// Add new field to all documents
	await collection.updateMany({isActive: {$exists: false}}, {$set: {isActive: true}});
};
```

**Example 3: Data transformation**

```typescript
export const up: IMigrationScript["up"] = async (db: Db): Promise<void> => {
	const collection = db.collection("Orders");
	const documents = await collection.find({}).toArray();

	for (const doc of documents) {
		// Transform data
		await collection.updateOne({_id: doc._id}, {$set: {processedData: transformData(doc)}});
	}
};
```

## Configuration

The MongoDB connection is configured via the `Mongo` class in `src/Mongo/Mongo.ts`. Update the connection string and database name as needed:

```typescript
const uri = "mongodb://localhost:27017";
const dbName = "your-database-name";
```

## Usage

### Development Mode

Run migrations using ts-node:

```bash
npm start
```

### Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Building

Build TypeScript to JavaScript:

```bash
npm run build:ts
```

Build standalone executable (Windows):

```bash
npm run build:exe
```

The executable will be created at `../../Output/SideCars/MongoDataMigration.exe`.

### Running the Executable

After building, run the executable directly:

```bash
./MongoDataMigration.exe
```

## How It Works

1. **Registry Generation**: Before running, the system scans the `migrations/` folder and generates `MigrationRegistryAuto.ts`
2. **Connection**: Connects to MongoDB using the configured connection string
3. **Tracking**: Checks the `_migrations` collection to determine the last applied migration ID
4. **Execution**: Runs all migrations with IDs greater than the last applied ID, in sequential order
5. **Recording**: After each successful migration, updates the `_migrations` collection with the new migration ID
6. **Cleanup**: Closes the database connection

## Migration Tracking

The system tracks applied migrations in a special `_migrations` collection in your database. This collection stores:

```javascript
{
	lastMigrationId: 13; // The ID of the most recently applied migration
}
```

## Scripts

- `npm start` - Run migrations in development mode
- `npm test` - Run test suite
- `npm run build:ts` - Compile TypeScript to JavaScript
- `npm run build:exe` - Build standalone executable
- `npm run generate:registry` - Manually regenerate migration registry
- `npm run clean:migrations` - Clean built migration files

## Logs

Logs are written to the `logs/` directory with timestamped filenames. Each session creates a new log file containing all console output.

## Best Practices

1. **Never modify existing migrations** - Once a migration has been run in production, create a new migration instead
2. **Use descriptive names** - Make migration filenames clear about what they do
3. **Keep migrations focused** - Each migration should handle one logical change
4. **Test migrations** - Test on a copy of production data before deploying
5. **Sequential numbering** - Leave gaps in numbering (e.g., 0001, 0010, 0020) to allow for insertions if needed
6. **Idempotent operations** - Where possible, write migrations that can safely run multiple times

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Dependencies

- **mongodb**: MongoDB driver for Node.js
- **tsyringe**: Dependency injection container
- **reflect-metadata**: Required for tsyringe decorators
- **natural-orderby**: Natural sorting of migration files
