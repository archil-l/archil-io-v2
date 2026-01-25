# AI Agent Implementation Plan

## Overview
Replace mock responses in the welcome feature with a real AI agent using AI SDK with **Anthropic (Claude)**. Implement server-side and client-side tools with a separated knowledge base.

**Choices made:**
- Provider: Anthropic (Claude)
- Knowledge base: Markdown files (`.md`) read by server tools
- Client tools: setTheme + copyToClipboard only

## File Structure

```
src/app/
├── server/                      # All server-side code
│   └── agent/                   # Agent service
│       ├── index.ts             # Route handler export
│       ├── chat-handler.ts      # Main chat API handler
│       ├── system-prompt.ts     # System prompt builder
│       └── tools/               # Server-side tools
│           ├── index.ts
│           ├── get-contact-info.ts
│           ├── get-experience.ts
│           └── get-technologies.ts
│
├── features/agent/
│   ├── index.ts                 # Re-exports
│   ├── config/
│   │   ├── index.ts
│   │   └── agent-config.ts      # Model settings (shared)
│   ├── tools/
│   │   └── client/              # Client-side tools only
│   │       ├── index.ts
│   │       ├── set-theme.ts
│   │       └── copy-to-clipboard.ts
│   ├── knowledge/               # Markdown files (not .ts!)
│   │   ├── about.md
│   │   ├── experience.md
│   │   ├── technologies.md
│   │   └── contact.md
│   └── hooks/
│       └── use-agent-chat.ts    # Custom useChat wrapper
```

## Implementation Steps

### 1. Install Dependencies
```bash
npm install @ai-sdk/anthropic
```

### 2. Create Knowledge Base Files (Markdown)
- `src/app/features/agent/knowledge/about.md` - Bio, background info
- `src/app/features/agent/knowledge/experience.md` - Work history
- `src/app/features/agent/knowledge/technologies.md` - Skills & tech stack
- `src/app/features/agent/knowledge/contact.md` - Contact details

These are plain markdown files. Server tools read them via a utility function.

### 3. Create Agent Configuration
- `src/app/features/agent/config/agent-config.ts` - Model name, temperature, maxSteps (shared config)
- `src/app/server/agent/system-prompt.ts` - Build dynamic system prompt (server-side)

### 4. Create Server-Side Tools
Tools with `execute` functions that run on the server:

**get-contact-info.ts**
```typescript
export const getContactInfoTool = {
  description: "Get contact information",
  inputSchema: z.object({}),
  execute: async () => contactInfo,
};
```

**get-experience.ts** - Return work history
**get-technologies.ts** - Return tech skills (filterable by category)

### 5. Create Client-Side Tools
Tools executed via `onToolCall` in the browser:

**set-theme.ts** - Toggle/set light/dark mode (uses existing `useThemeContext`)
**copy-to-clipboard.ts** - Copy text (e.g., email) to clipboard

### 6. Create Server Chat Service & Update Routes
Create `src/app/server/agent/` with the chat handler:

**`src/app/server/agent/chat-handler.ts`**
```typescript
import { streamText, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Request, Response } from "express";
import { serverTools } from "./tools";
import { buildSystemPrompt } from "./system-prompt";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function handleChatRequest(req: Request, res: Response) {
  const { messages } = req.body;
  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: serverTools,
  });
  // Stream response back
}
```

**Modify `deployment/server.js`:**
- Add `express.json()` middleware
- Add `/api/agent` POST route that imports from `src/app/server/agent`

### 7. Create useAgentChat Hook
`src/app/features/agent/hooks/use-agent-chat.ts`:
- Wrap AI SDK's `useChat` hook
- Configure transport to `/api/agent`
- Handle client-side tools via `onToolCall`:
  - `setTheme`: Use `useThemeContext` to toggle theme
  - `copyToClipboard`: Use `navigator.clipboard.writeText()`
- Call `addToolOutput()` for each client tool

### 8. Update use-conversation.ts
Replace mock implementation:
- Use `useAgentChat` instead of manual state
- Convert AI SDK messages to `MessageType` for localStorage
- Keep existing `handleClearConversation` logic

### 9. Environment Setup
- Add `ANTHROPIC_API_KEY` to environment
- Create `.env.example` for documentation
- Update AWS Lambda deployment to include API key

## Key Files to Modify

| File | Changes |
|------|---------|
| `deployment/server.js` | Add JSON middleware, forward `/api/*` to handlers |
| `src/app/features/welcome/hooks/use-conversation.ts` | Replace mock with `useAgentChat` |
| `package.json` | Add `@ai-sdk/anthropic` |

## New Files to Create

**Server-side (`src/app/server/agent/`):**
1. `chat-handler.ts` - Main API handler
2. `system-prompt.ts` - System prompt builder
3. `tools/index.ts` - Server tools export
4. `tools/get-contact-info.ts`
5. `tools/get-experience.ts`
6. `tools/get-technologies.ts`
7. `tools/read-knowledge.ts` - Utility to read .md files

**Client-side (`src/app/features/agent/`):**
1. `config/agent-config.ts` - Shared config
2. `tools/client/set-theme.ts`
3. `tools/client/copy-to-clipboard.ts`
4. `hooks/use-agent-chat.ts` - Custom hook
5. `index.ts` - Re-exports

**Knowledge base (`src/app/features/agent/knowledge/`):**
1. `about.md`
2. `experience.md`
3. `technologies.md`
4. `contact.md`

## Server-Side Tools Summary

| Tool | Purpose | Input |
|------|---------|-------|
| `getContactInfo` | Return contact details | none |
| `getExperience` | Return work history | `limit?: number` |
| `getTechnologies` | Return tech skills | `category?: string` |

## Client-Side Tools Summary

| Tool | Purpose | Input |
|------|---------|-------|
| `setTheme` | Change theme | `theme: "light" | "dark" | "toggle"` |
| `copyToClipboard` | Copy to clipboard | `text: string, label?: string` |

## Verification

1. **API endpoint**: `curl -X POST http://localhost:5173/api/agent` returns streaming response
2. **Server tools**: Ask "What technologies do you use?" - should call `getTechnologies`
3. **Client tools**:
   - Ask "switch to dark mode" - should toggle theme
   - Ask "copy your email" - should copy to clipboard
4. **Persistence**: Refresh page, conversation should persist
5. **Clear**: Clear conversation button resets to welcome message
