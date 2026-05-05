/** @format */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Read once at startup. The KB is a static markdown doc shipped with the
// server, so we don't need to re-read it for every auto-resolve job.
let cached: string | null = null;

export async function loadKnowledgeBase(): Promise<string> {
	if (cached !== null) return cached;
	const path = fileURLToPath(new URL("../knowledge-base.md", import.meta.url));
	cached = await readFile(path, "utf8");
	return cached;
}
