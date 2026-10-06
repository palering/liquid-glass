import { readFile, mkdir, writeFile } from "node:fs/promises";
try {
  const raw = await readFile("benchmarks/results/latest.json", "utf8");
  await mkdir("public/benchmarks/results", { recursive: true });
  await writeFile("public/benchmarks/results/latest.json", raw);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
