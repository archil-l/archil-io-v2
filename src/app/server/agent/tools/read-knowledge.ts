import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, "../../../features/agent/knowledge");

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
