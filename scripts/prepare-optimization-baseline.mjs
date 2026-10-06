import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Only repository-owned sources are materialized. No upstream install scripts.
const revision = execFileSync("git", ["rev-parse", `${process.argv[2] ?? "8f6b9ff"}^{commit}`], { encoding: "utf8" }).trim();
const directory = resolve(".local/optimization-baseline");
mkdirSync(directory, { recursive: true });
const archive = execFileSync("git", ["archive", revision, "src", "vendor"]);
execFileSync("tar", ["-xf", "-", "-C", directory], { input: archive });
writeFileSync(`${directory}/revision.txt`, `${revision}\n`);
console.log(`Prepared source baseline ${revision}`);
