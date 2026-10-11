# MongoDataMigration

A TypeScript-based MongoDB migration tool for managing database schema and data changes over time.

## Overview

MongoDataMigration runs TypeScript migration files in sequential order to evolve your MongoDB database as your data shape changes. Migrations are executed only once and tracked in the database to prevent re-execution.

## Features

- **Sequential Execution**: Migrations run in order based on their numeric ID
- **Run-once tracking**: Each migration runs only once; the system tracks the highest migration ID that has been applied
- **Transactional on replica sets**: Where the MongoDB deployment supports it, each migration runs in a transaction and is automatically rolled back on failure, so a failed run can simply be re-run
- **Single-run lock**: Only one instance can run migrations against a database at a time; a second instance fails fast instead of racing the first
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

Each migration must export an `up` function that implements the `IMigrationScript` interface. `up` receives the database and, when one is available, a MongoDB `session` — **always pass `{session}` into every driver call you make**, even though `session` may be `undefined`:

```typescript
import {ClientSession, Db} from "mongodb";
import {IMigrationScript} from "../src/Types/Migration";

export const up: IMigrationScript["up"] = async (db: Db, session?: ClientSession): Promise<void> => {
	const collection = db.collection("YourCollection");

	// Your migration logic here — note the {session} passed to the driver call
	await collection.updateMany({}, {$set: {newField: "defaultValue"}}, {session});
};
```

Passing `{session}` costs nothing when there is no transaction (the driver just ignores `session: undefined`), but it's what lets the migration participate in a transaction when one exists. See [Transaction Safety & Idempotency](#transaction-safety--idempotency) below for why this matters.

### Migration Examples

**Example 1: Adding documents (idempotent via upsert)**

```typescript
export const up: IMigrationScript["up"] = async (db: Db, session?: ClientSession): Promise<void> => {
	const collection = db.collection("Users");

	const users = [
		{name: "John Doe", email: "john@example.com"},
		{name: "Jane Smith", email: "jane@example.com"},
	];

	// Upsert on a unique key instead of insertMany, so running this twice never creates duplicates.
	await collection.bulkWrite(
		users.map(user => ({
			updateOne: {filter: {email: user.email}, update: {$set: user}, upsert: true},
		})),
		{session}
	);
};
```

**Example 2: Updating schema**

```typescript
export const up: IMigrationScript["up"] = async (db: Db, session?: ClientSession): Promise<void> => {
	const collection = db.collection("Products");

	// Add new field to all documents
	await collection.updateMany({isActive: {$exists: false}}, {$set: {isActive: true}}, {session});
};
```

**Example 3: Data transformation**

```typescript
export const up: IMigrationScript["up"] = async (db: Db, session?: ClientSession): Promise<void> => {
	const collection = db.collection("Orders");
	const documents = await collection.find({}, {session}).toArray();

	for (const doc of documents) {
		// Transform data
		await collection.updateOne({_id: doc._id}, {$set: {processedData: transformData(doc)}}, {session});
	}
};
```

## Configuration

The MongoDB connection is configured via environment variables, read in `src/Mongo/Mongo.ts`:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGO_DB` | **Yes** | _(none)_ | The target database name. There is no default — if it's unset or empty, the tool throws immediately on startup instead of silently running against a placeholder database. |
| `MONGO_URI` | No | `mongodb://localhost:27017` | The MongoDB connection string. |

```bash
MONGO_DB=your-database-name MONGO_URI=mongodb://your-host:27017 npm start
```

`MONGO_URI` is allowed to default to a local server because that's a reasonable thing to assume during development. `MONGO_DB` is not: a migration that quietly ran against the wrong database would report success and record itself as applied, with nothing to indicate it touched the wrong place — so it has no default at all.

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

Build standalone executable:

```bash
npm run build:exe
```

The executable will be created at `build/MongoDataMigration.exe`.

This uses Node's own [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html) feature (`scripts/BuildExe.js`): it bundles `build/src/index.js` and its dependencies into one file with `esbuild`, then embeds that bundle into a copy of whichever `node` binary is running the build, using `postject`. The resulting `.exe` runs whatever Node version built it — there's no separately-downloaded runtime to go stale, so building with Node 22+ gives you a Node 22+ executable. Build on the newest Node version you intend to support.

### Running the Executable

After building, run the executable directly:

```bash
./MongoDataMigration.exe
```

## How It Works

1. **Registry Generation**: Before running, the system scans the `migrations/` folder and generates `MigrationRegistryAuto.ts`
2. **Connection**: Connects to MongoDB using the configured connection string
3. **Locking**: Acquires an exclusive lock in the `_migrations_lock` collection so only one instance of the tool can run migrations at a time (see [Concurrency: Single-Run Lock](#concurrency-single-run-lock) below)
4. **Tracking**: Checks the `_migrations` collection to determine the last applied migration ID
5. **Execution**: Runs all migrations with IDs greater than the last applied ID, in sequential order
   > ⚠️ **Only the highest applied ID is tracked** — not which individual migrations ran. If you add a new migration numbered *lower* than one that has already run against a database, it will be silently skipped there, forever, with no warning. New migrations must always get a number higher than the highest one that already exists. See [Migration Tracking](#migration-tracking) below.
6. **Recording**: After each successful migration, updates the `_migrations` collection with the new migration ID
7. **Cleanup**: Releases the lock and closes the database connection

## Concurrency: Single-Run Lock

Only one instance of the tool is allowed to run migrations against a given database at a time. This matters because two instances starting together — two installers, or an installer racing a manual run — would otherwise both read the same "last applied ID" and both try to apply the same migrations at once.

Before checking for pending migrations, the tool inserts a document with a fixed `_id` of `"lock"` into the `_migrations_lock` collection. `_id` always has a unique index in MongoDB, so this insert is atomic: if two instances race to do it at the same moment, only one insert can succeed. The other instance's insert fails immediately with a duplicate-key error, and that instance **fails fast** with an error naming when the lock was acquired and by which process — it does not wait, retry, or run anything.

The lock is released (the document is deleted) as soon as the run finishes, whether it succeeded or failed — a failed run still frees the lock so the next attempt isn't blocked by it.

**Stale locks:** if a process holding the lock is killed outright (not a normal failure, but e.g. the process or machine is forcibly terminated), it never reaches its cleanup step and the lock document is left behind. A later run will then refuse to start with "Another migration run is already in progress," even though nothing is actually running. If you're sure no run is genuinely in progress, delete the document with `_id: "lock"` from the `_migrations_lock` collection and try again.

## Transaction Safety & Idempotency

## Transaction Safety & Idempotency

Before running any migrations, the tool checks whether the MongoDB connection supports transactions — that is, whether it's talking to a **replica set** or a **sharded cluster (mongos)**, including **MongoDB Atlas**, which is always a replica set. A standalone `mongod` does not support transactions at all.

**If transactions are supported:** each migration's `up()` runs inside a MongoDB session transaction, along with the write that records it as applied. If the migration throws partway through — a network blip, a bad document, anything — the entire transaction is rolled back automatically. Nothing it wrote is kept, the "applied" record is never created, and the database is left exactly as it was before the migration started. You can simply fix the problem and run the tool again.

For this to actually work, **every database call inside your migration must be passed the `session` argument** (see the [Migration Template](#migration-template) above). A write made without `{session}` happens outside the transaction and will **not** be rolled back — so leaving `session` off even one call silently defeats this safety net for that call.

**If transactions are not supported** (a standalone server), the tool logs a warning and runs migrations without rollback. In that case, a migration that fails partway leaves whatever it already wrote in place, and re-running the tool will execute that migration's `up()` from the beginning again. This makes idempotency a **hard requirement**, not a nice-to-have, for any environment that might run against a standalone server:

- Prefer `updateMany`/`updateOne` with `$set` — setting the same value twice has no extra effect.
- Avoid `insertMany`/`insertOne` for fixed data; use `bulkWrite` with `updateOne` + `upsert: true` on a unique key instead (see Example 1 above), so re-running never creates duplicates.
- If you must insert, either rely on a unique index to reject the duplicate (and treat the resulting duplicate-key error as a no-op), or check for existing documents first.

**Bottom line:** write every migration as if it might run on a standalone server and might be re-run after a partial failure. Transactions give you automatic protection where they're available, but idempotency is what keeps you safe everywhere else — and it's free insurance even where transactions do work.

## Migration Tracking

The system tracks applied migrations in a special `_migrations` collection in your database. That collection holds exactly one document, under a fixed `_id` so it can be looked up and upserted by a real filter instead of relying on "there's only ever one row in here":

```javascript
{
	_id: "appliedMigrations",
	migrationId: 13, // The ID of the most recently applied migration
	lastApplied: ISODate("2024-01-01T00:00:00.000Z"),
}
```

This is intentionally a **single number, not a list**. The tool only ever asks "what's the highest ID applied so far?" and runs every migration numbered above it.

**This means numbering is a one-way ratchet.** Once a database has applied migration `0013`, it will never run anything numbered `0013` or lower again — including a migration file that gets added *afterward* but happens to be numbered lower (e.g. `0005-something.ts`). That file will not run, will not be skipped with a warning, and will not show up in any log or error. It will simply never execute on that database.

**Rule:** always give a new migration a number higher than the highest-numbered file currently in `migrations/`. Do not reuse a low number "to fill a gap" after higher-numbered migrations already exist — see Best Practices below.

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
5. **Always number upward** - A new migration's number must be higher than every number currently in `migrations/`. Never reuse a skipped or "gap" number once a higher-numbered migration exists, and never insert a lower number after the fact — only the highest applied ID is tracked, so a lower-numbered migration added later will be silently skipped on any database that already ran past it (see [Migration Tracking](#migration-tracking))
6. **Idempotent operations** - Write every migration so it's safe to run more than once (e.g. `updateMany`/upsert instead of `insertMany`). On a replica set, a failed migration is rolled back automatically; on a standalone server it isn't, so idempotency is what keeps a re-run safe. See [Transaction Safety & Idempotency](#transaction-safety--idempotency)
7. **Always pass `{session}`** - Every database call inside `up()` must include the `session` argument it receives, or that call won't be covered by the automatic rollback described above

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Dependencies

- **mongodb**: MongoDB driver for Node.js
- **tsyringe**: Dependency injection container
- **reflect-metadata**: Required for tsyringe decorators
- **natural-orderby**: Natural sorting of migration files
