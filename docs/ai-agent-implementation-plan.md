# AI Agent Implementation Plan

## Overview
Replace mock responses in the welcome feature with a real AI agent using AI SDK with **Anthropic (Claude)**. Implement server-side and client-side tools with a separated knowledge base.

**Choices made:**
- Provider: Anthropic (Claude)
- Knowledge base: TypeScript types/structure only (no placeholder content)
- Client tools: setTheme + copyToClipboard only

## File Structure

```
src/app/features/agent/
├── index.ts                     # Re-exports
├── config/
│   ├── index.ts
│   ├── agent-config.ts          # Model settings
│   └── system-prompt.ts         # System prompt builder
├── tools/
│   ├── index.ts
│   ├── server/
│   │   ├── index.ts
│   │   ├── get-contact-info.ts
│   │   ├── get-experience.ts
│   │   └── get-technologies.ts
│   └── client/
│       ├── index.ts
│       ├── set-theme.ts         # Toggle light/dark mode
│       └── copy-to-clipboard.ts # Copy text to clipboard
├── knowledge/
│   ├── index.ts
│   ├── about.ts                 # Bio, background
│   ├── experience.ts            # Work history
│   ├── technologies.ts          # Skills & tech stack
│   └── contact.ts               # Contact info
└── hooks/
    └── use-agent-chat.ts        # Custom useChat wrapper
```

## Implementation Steps

### 1. Install Dependencies
```bash
npm install @ai-sdk/anthropic
```

### 2. Create Knowledge Base Files (TypeScript types only)
- `src/app/features/agent/knowledge/about.ts` - `AboutInfo` type + empty export
- `src/app/features/agent/knowledge/experience.ts` - `Experience` type + empty array
- `src/app/features/agent/knowledge/technologies.ts` - `Technology` type + empty array
- `src/app/features/agent/knowledge/contact.ts` - `ContactInfo` type + empty export

You will fill in the actual content later.

### 3. Create Agent Configuration
- `src/app/features/agent/config/agent-config.ts` - Model name, temperature, maxSteps
- `src/app/features/agent/config/system-prompt.ts` - Build dynamic system prompt from knowledge

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

### 6. Add API Route to Express Server
Modify `deployment/server.js`:
- Add `express.json()` middleware
- Add `/api/chat` POST route before React Router handler
- Import and use chat handler

**New file: `src/api/chat.ts`**
```typescript
import { streamText, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

export async function handleChatRequest(req, res) {
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

### 7. Create useAgentChat Hook
`src/app/features/agent/hooks/use-agent-chat.ts`:
- Wrap AI SDK's `useChat` hook
- Configure transport to `/api/chat`
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
| `deployment/server.js` | Add JSON middleware, `/api/chat` route |
| `src/app/features/welcome/hooks/use-conversation.ts` | Replace mock with `useAgentChat` |
| `package.json` | Add `@ai-sdk/anthropic` |

## New Files to Create

1. `src/api/chat.ts` - Express route handler
2. `src/app/features/agent/knowledge/*.ts` - Knowledge base (4 files)
3. `src/app/features/agent/config/*.ts` - Configuration (2 files)
4. `src/app/features/agent/tools/server/*.ts` - Server tools (3 files)
5. `src/app/features/agent/tools/client/*.ts` - Client tools (2 files)
6. `src/app/features/agent/hooks/use-agent-chat.ts` - Custom hook
7. `src/app/features/agent/index.ts` - Re-exports

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

1. **API endpoint**: `curl -X POST http://localhost:5173/api/chat` returns streaming response
2. **Server tools**: Ask "What technologies do you use?" - should call `getTechnologies`
3. **Client tools**:
   - Ask "switch to dark mode" - should toggle theme
   - Ask "copy your email" - should copy to clipboard
4. **Persistence**: Refresh page, conversation should persist
5. **Clear**: Clear conversation button resets to welcome message
