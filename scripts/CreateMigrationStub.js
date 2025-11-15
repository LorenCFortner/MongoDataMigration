const fs = require("fs");
const path = require("path");

const content = `import { IMigrationScript } from "./src/Types/Migration";
export interface Migration extends IMigrationScript { id: number; name: string; }
export const migrationRegistry: Migration[] = [];
export const migrationCount = 0;
`;

const filePath = path.resolve(__dirname, "..", "MigrationRegistryAuto.ts");

fs.writeFileSync(filePath, content);

console.log(`Wrote stub to ${filePath}`);
