# Story 4.2: Priority-Sorted Inbox View

## Status: review

## Story

**As a** user,
**I want** to view my inbox sorted by priority with category labels,
**So that** I can process the most urgent emails first.

## Files Changed

- `app/(app)/inbox/page.tsx` — New RSC page
- `components/inbox/inbox-list.tsx` — New Client Component with Realtime + polling fallback
- `app/(app)/layout.tsx` — Added Inbox nav link
