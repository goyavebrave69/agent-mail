---
title: 'AI Draft Streaming Typing Animation'
type: 'feature'
created: '2026-04-09'
status: 'done'
baseline_commit: '6815eaa7510c13f2b530823ab1cfa8899735144b'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When an AI draft is generated, its full content appears instantly in the textarea — there is no progressive visual feedback during the "rendering" phase, which feels abrupt compared to the streaming experience of ChatGPT or Claude.

**Approach:** After the draft content is received from the server, animate it into the compose area character-by-chunk using a typewriter effect with a blinking cursor, then hand off to the editable textarea when animation completes. All animation state stays local to the component — no backend or store changes.

## Boundaries & Constraints

**Always:**
- Animation runs entirely client-side; no changes to the edge function or `lib/ai/draft.ts`
- Animation state (`streamingContent`, `isStreaming`) lives in `DraftSection` local state only — do not put it in the draft-store
- After animation completes, textarea must be focused and editable as normal
- Clean up the interval on component unmount (use `useRef` for the interval handle)
- Accessible: the streaming overlay must have `role="textbox"` and `aria-live="polite"`

**Ask First:**
- If animation speed needs adjusting after user testing (default: ~160 chars/sec, 4 chars every 25 ms)

**Never:**
- Do not modify the edge function, `lib/ai/draft.ts`, or the draft-store
- Do not block the Cancel button during animation — cancelling during animation must work normally
- Do not use `requestAnimationFrame` for this — `setInterval` is sufficient and easier to clean up

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Normal draft | Content received, 200–1000 chars | Text types out at ~160 chars/sec, blinking cursor shown | N/A |
| Very short draft | <50 chars | Animation completes in <0.4s — brief but visible | N/A |
| Long draft | >2000 chars | Animation at same speed (~13s max) | N/A |
| Component unmounts during animation | User navigates away mid-animation | Interval is cleared via cleanup ref — no state update on unmounted component | `clearInterval` in useEffect cleanup |
| Generation error | Draft status = error | No animation — `startTypewriter` is never called, error UI shows normally | N/A |

</frozen-after-approval>

## Code Map

- `components/draft/draft-section.tsx` -- Orchestrator; add `streamingContent`, `isStreaming` state + `startTypewriter` function; intercept content arrival to start animation instead of directly calling `updateManualContent`
- `components/draft/manual-compose.tsx` -- Accept `streamingContent?: string` and `isStreaming?: boolean` props; render streaming overlay (read-only div with blinking cursor) when `isStreaming`, otherwise render normal textarea

## Tasks & Acceptance

**Execution:**
- [x] `components/draft/draft-section.tsx` -- Add local state: `streamingContent: string` (default `''`) and `isStreaming: boolean` (default `false`); add `streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)`; add `useEffect` cleanup that calls `clearInterval(streamIntervalRef.current)` on unmount; add `startTypewriter(fullContent: string)` function: sets `isStreaming(true)`, sets `streamingContent('')`, initialises `index = 0`, starts interval (4 chars / 25ms), on completion calls `updateManualContent(fullContent)` then `setIsStreaming(false)`; in `handleCreateDraft`, replace `updateManualContent(draft.content)` call with `startTypewriter(draft.content)`; pass `streamingContent` and `isStreaming` to `<ManualCompose>` -- keeps animation state local, store unchanged
- [x] `components/draft/manual-compose.tsx` -- Add `streamingContent?: string` and `isStreaming?: boolean` to `ManualComposeProps`; when `isStreaming` is true, replace the `<textarea>` with a `<div role="textbox" aria-live="polite" aria-label="Message body">` that renders `streamingContent` as preformatted text followed by a `<span className="animate-pulse inline-block">▋</span>` cursor; keep the rest of the form (To, Subject, buttons) visible but disable the "Brouillon IA" button when `isStreaming`; when `isStreaming` is false, render the normal `<textarea>` as before -- provides the visual typing effect without touching store

**Acceptance Criteria:**
- Given a draft is successfully generated, when the content arrives, then text streams into the compose area character-by-chunk with a blinking `▋` cursor visible
- Given the animation is running, when it completes, then the blinking cursor disappears and the compose area becomes an editable textarea containing the full text, focused automatically
- Given an animation is in progress, when the component unmounts (user navigates away), then the interval is cleared with no console errors
- Given a draft generation error, when the error state is displayed, then the textarea remains normal with no animation
- Given `isStreaming` is true, when the user clicks Cancel, then animation stops and the compose area closes normally

## Design Notes

Typewriter tick logic (inside `startTypewriter`):
```ts
const CHUNK = 4
const TICK_MS = 25
let idx = 0
streamIntervalRef.current = setInterval(() => {
  idx = Math.min(idx + CHUNK, fullContent.length)
  setStreamingContent(fullContent.slice(0, idx))
  if (idx >= fullContent.length) {
    clearInterval(streamIntervalRef.current!)
    streamIntervalRef.current = null
    updateManualContent(fullContent)
    setIsStreaming(false)
  }
}, TICK_MS)
```

Streaming overlay in ManualCompose:
```tsx
{isStreaming ? (
  <div
    role="textbox"
    aria-live="polite"
    aria-label="Message body"
    className="w-full rounded-lg border p-3 text-sm min-h-[12rem] whitespace-pre-wrap font-[inherit]"
  >
    {streamingContent}
    <span className="animate-pulse inline-block ml-0.5">▋</span>
  </div>
) : (
  <textarea ... />
)}
```

## Verification

**Commands:**
- `npm run typecheck` -- expected: 0 errors
- `npm run lint` -- expected: 0 errors
- `npm test` -- expected: all existing tests pass

**Manual checks:**
- Click "Brouillon IA" → wait for generation → observe text streaming in with `▋` cursor
- Confirm textarea is editable and focused after animation ends
- Confirm Cancel button works during animation

## Suggested Review Order

**Animation logic (entry point)**

- Core typewriter: guard against double-trigger, interval lifecycle, and final store write
  [`draft-section.tsx:58`](../../components/draft/draft-section.tsx#L58)

- Interval cleanup on unmount; `isStreaming`/`streamingContent` local state declarations
  [`draft-section.tsx:22`](../../components/draft/draft-section.tsx#L22)

- `handleCreateDraft` — wires content arrival to animation instead of direct store write
  [`draft-section.tsx:118`](../../components/draft/draft-section.tsx#L118)

**UI rendering**

- Streaming overlay div with blinking cursor; swap with textarea when animation ends
  [`manual-compose.tsx:108`](../../components/draft/manual-compose.tsx#L108)

- Focus restore effect when `isStreaming` → false; button disabled during streaming
  [`manual-compose.tsx:44`](../../components/draft/manual-compose.tsx#L44)

- Props addition: `isStreaming`, `streamingContent` on `ManualComposeProps`
  [`manual-compose.tsx:22`](../../components/draft/manual-compose.tsx#L22)
