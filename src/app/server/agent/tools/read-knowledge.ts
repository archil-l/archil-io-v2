import { readFileSync } from "fs";
import { join } from "path";

// In Lambda, the working directory is /var/task where our code is deployed
// The knowledge files are bundled in the dist/server directory structure
// Use process.cwd() for Lambda compatibility (CommonJS bundle)
const KNOWLEDGE_DIR = join(
  process.cwd(),
  "dist/server/features/agent/knowledge",
);

export function readKnowledge(filename: string): string {
  try {
    const filePath = join(KNOWLEDGE_DIR, filename);
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`Failed to read knowledge file: ${filename}`, error);
    return "";
  }
}

export function readAllKnowledge(): Record<string, string> {
  return {
    about: readKnowledge("about.md"),
    experience: readKnowledge("experience.md"),
    technologies: readKnowledge("technologies.md"),
    contact: readKnowledge("contact.md"),
  };
}
