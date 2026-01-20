# Website Restructure Plan: Single-Page AI Assistant

## Overview

Transform the multi-page website with sidebar navigation into a single-page AI assistant interface.

## Goals

- Remove sidebar navigation
- Add floating menu button (top-left corner)
- Introduction message at the top
- Conversation history in the middle (using existing Conversation/Message components)
- Predefined prompt buttons for common questions
- Input box at the bottom
- Session tracking via localStorage (UUID + conversation history)

## Layout Structure

```
┌─────────────────────────────────────────────┐
│ [☰ Menu]                                    │
├─────────────────────────────────────────────┤
│                                             │
│  <Conversation>                             │
│    <ConversationContent>                    │
│      <Message from="assistant">             │
│        Welcome! 🖖🏻 ...                     │
│      </Message>                             │
│                                             │
│      <Message from="user">                  │
│        User's question...                   │
│      </Message>                             │
│      ...                                    │
│    </ConversationContent>                   │
│    <ConversationScrollButton />             │
│  </Conversation>                            │
│                                             │
├─────────────────────────────────────────────┤
│  <Suggestions>                              │
│    [About you] [Your projects] [Contact]    │
│  </Suggestions>                             │
│                                             │
│  <PromptInput>                              │
│    [Ask me anything...            ] [↵]     │
│  </PromptInput>                             │
└─────────────────────────────────────────────┘
```

## Files to Modify

### 1. `src/app/root.tsx`

- Remove `SidebarProvider`, `AppSidebar`, `SidebarInset` components
- Remove `SidebarTrigger` from header
- Simplify to basic layout wrapper

### 2. `src/app/pages/welcome.tsx`

- Keep existing Conversation, Message components
- Add floating menu button (top-left)
- Add `Suggestions` component with predefined prompts
- Integrate session management (localStorage)
- Load conversation history on mount
- Save conversation on each new message

## Files to Create

### 3. `src/app/lib/session.ts`

Session and storage utility functions:

```typescript
// Generate/retrieve session ID
getOrCreateSessionId(): string

// Conversation history management
getConversationHistory(): Message[]
saveConversationHistory(messages: Message[]): void
clearConversation(): void
```

### 4. `src/app/components/floating-menu.tsx`

- Fixed position button in top-left corner
- Opens Sheet (slide-out drawer) from the left
- Menu options:
  - Clear conversation
  - About / Contact info
  - Theme toggle (if applicable)

## Components Being Used (from ai-elements)

### Conversation (`src/components/ai-elements/conversation.tsx`)

- `Conversation` - Main wrapper with auto-scroll behavior
- `ConversationContent` - Inner container with flex column layout
- `ConversationScrollButton` - Scroll to bottom button

### Message (`src/components/ai-elements/message.tsx`)

- `Message` - Wrapper with `from` prop ("user" | "assistant")
- `MessageContent` - Styled content container
- `MessageResponse` - Markdown rendering via Streamdown

### Suggestions (`src/components/ai-elements/suggestion.tsx`)

- `Suggestions` - Horizontal scrollable container
- `Suggestion` - Individual prompt button

### PromptInput (`src/components/ai-elements/prompt-input.tsx`)

- `PromptInput` - Form wrapper with file handling
- `PromptInputBody` - Content container
- `PromptInputTextarea` - Text input with keyboard handling
- `PromptInputSubmit` - Submit button

## Session Management

### Storage Keys

- `archil-io-session-id` - UUID for the visitor
- `archil-io-conversation` - JSON array of messages

### Message Structure

```typescript
type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts: { type: "text"; text: string }[];
};
```

### Behavior

- On first load: Generate UUID, store in localStorage
- On page load: Retrieve conversation history from localStorage
- On new message: Append to history, save to localStorage
- Clear option: Reset conversation but keep session ID

## Predefined Prompts (Suggestions)

Example prompts to include:

- "Tell me about your experience"
- "What technologies do you work with?"
- "Show me your recent projects"
- "How can I contact you?"

## Files to Remove/Clean Up (Optional)

- `src/app/layout/app-sidebar.tsx` - No longer needed
- `src/app/layout/navigation.ts` - No longer needed
- `src/app/pages/work.tsx` - If not used elsewhere
