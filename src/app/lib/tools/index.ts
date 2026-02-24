import { ToolSet } from "ai";
import { toggleThemeTool, checkThemeTool } from "./client-side-tools";
import { getContactInfoTool } from "./get-contact-info";
import { getExperienceTool } from "./get-experience";
import { getTechnologiesTool } from "./get-technologies";

export const allTools = {
  getContactInfo: getContactInfoTool,
  getExperience: getExperienceTool,
  getTechnologies: getTechnologiesTool,
  toggleTheme: toggleThemeTool,
  checkTheme: checkThemeTool,
} satisfies ToolSet;

export { readKnowledge, readAllKnowledge } from "./read-knowledge";
