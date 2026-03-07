# Client-Side Tools Pattern

## Critical Rule: NO Execute Functions for Client-Side Tools

Client-side tools defined in `src/app/lib/tools/client-side-tools.ts` should **NEVER have execute functions**.

### Why?

- Client-side tools are meant to be executed by the **browser/client**, not the server
- Adding an `execute` function makes the AI SDK try to execute the tool on the **server side**, which defeats the purpose
- The actual execution happens in the corresponding UI component (e.g., `ToggleThemeToolUI`)

### Correct Pattern

```typescript
// ✅ CORRECT - No execute function
export const toggleThemeTool = tool({
  description: "Toggle theme between light and dark mode.",
  inputSchema: z.object({}),
  // NO execute function!
});

// ❌ WRONG - Don't add execute here
export const toggleThemeTool = tool({
  description: "Toggle theme between light and dark mode.",
  inputSchema: z.object({}),
  execute: async () => {
    /* ... */
  }, // ❌ WRONG FOR CLIENT-SIDE TOOLS
});
```

### Flow

1. **Tool Definition** (`client-side-tools.ts`): Define schema and description only
2. **Server Processing**: AI SDK streams tool call to client
3. **Client Component** (e.g., `ToggleThemeToolUI`):
   - Receives `DynamicToolUIPart`
   - Actually executes the action (calls `toggleTheme()` hook, etc.)
   - Uses `useTheme()`, `useContext()`, or other browser APIs
   - Returns result to show in UI

### Example: toggleThemeTool

**Tool Definition** (no execute):

```typescript
export const toggleThemeTool = tool({
  description: "Toggle theme...",
  inputSchema: z.object({}),
});
```

**UI Component** (actual execution):

```typescript
export function ToggleThemeToolUI({ tool }: ToggleThemeToolUIProps) {
  const { toggleTheme, theme } = useTheme();

  useEffect(() => {
    // HERE is where the actual theme toggle happens
    toggleTheme();
  }, [tool.output]);

  return <ThemeSwitcher targetTheme={theme} />;
}
```

## Remember

- Client-side tools = Schema only, no execution
- Execution happens in browser-based UI components
- This follows AI SDK v6 Dynamic Tool UI pattern
