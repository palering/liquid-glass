import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
async function files(dir) {
  const list = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      list.map((x) =>
        x.isDirectory() ? files(`${dir}/${x.name}`) : `${dir}/${x.name}`,
      ),
    )
  ).flat();
}
// Relative paths only; no local username, home path or Git author metadata.
const inputs = (
  await Promise.all(["src", "vendor/studio/src", "benchmarks"].map(files))
)
  .flat()
  .filter((x) => !x.startsWith("benchmarks/results/"))
  .sort();
const hash = createHash("sha256");
for (const file of inputs)
  hash
    .update(file + "\0")
    .update(await readFile(file))
    .update("\0");
let revision = null;
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {}
const data = {
  algorithm: "sha256",
  sourceSha256: hash.digest("hex"),
  inputs,
  revision,
};
await mkdir("public", { recursive: true });
await writeFile(
  "public/benchmark-source.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log(data.sourceSha256);
