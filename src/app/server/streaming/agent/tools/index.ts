import { setThemeTool } from "./client-side-tools";
import { getContactInfoTool } from "./get-contact-info";
import { getExperienceTool } from "./get-experience";
import { getTechnologiesTool } from "./get-technologies";

export const serverTools = {
  getContactInfo: getContactInfoTool,
  getExperience: getExperienceTool,
  getTechnologies: getTechnologiesTool,
  setTheme: setThemeTool,
};

export { readKnowledge, readAllKnowledge } from "./read-knowledge";
