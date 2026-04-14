<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Hydration safety rules (global)

When editing client components in `src/`, enforce these rules:

1. Never use `typeof window !== "undefined"` as a render condition. Use a mounted-state pattern (`const [mounted, setMounted] = useState(false)` + `useEffect`) instead.
2. Never use `Date.now()`, `Math.random()`, or `new Date()` directly in JSX. Compute and store client-specific values in state after mount.
3. Any component reading `localStorage`, cookies, or `window` must use the mounted pattern before rendering theme-dependent or user-dependent UI.
4. Ensure `suppressHydrationWarning` is present on the root `<html>` in `src/app/layout.tsx`.
5. For app-wrapping context providers, initialize state to match server render and defer client-specific values until after mount.
