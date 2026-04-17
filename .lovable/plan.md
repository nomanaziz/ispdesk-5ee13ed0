
User wants a global loading overlay system so that when API/edge function calls are in progress (especially multiple/long-running ones like deploy jobs, inspect, backup, fetch users), the UI shows a light animated loader and **blocks other interactions** until complete.

Current state: individual buttons show spinners (`Loader2`), but user can still click other things and trigger parallel API hits, which is slow on MikroTik native API.

## Plan: Global Loading Overlay + Mutation Lock

### 1. New `GlobalLoadingOverlay` component
`src/components/GlobalLoadingOverlay.tsx`
- Fixed full-screen overlay (`z-[100]`), semi-transparent backdrop (`bg-background/60 backdrop-blur-sm`)
- Centered card with animated spinner + message + optional sub-text (e.g. "৩টি ডিভাইসে কাজ চলছে...")
- `pointer-events: auto` → blocks all clicks underneath
- Uses existing `animate-fade-in` + `animate-scale-in` utilities

### 2. Global loading store
`src/stores/useGlobalLoading.ts` (zustand — already in project deps via shadcn patterns, else simple React context)
- State: `{ active: boolean, message: string, count: number }`
- Actions: `start(message)`, `stop()`, auto-stack (multiple starts increment count, only hides at 0)

### 3. Auto-wire to React Query mutations
In `src/App.tsx` — wrap `QueryClient` with `MutationCache` callbacks:
```ts
new QueryClient({
  mutationCache: new MutationCache({
    onMutate: () => useGlobalLoading.getState().start(),
    onSettled: () => useGlobalLoading.getState().stop(),
  }),
})
```
This makes **every** `useMutation` across the app automatically trigger the overlay — zero changes needed in 200+ existing dialogs/forms.

### 4. Render overlay once
Add `<GlobalLoadingOverlay />` in `App.tsx` (next to `<Toaster />`).

### 5. Opt-out mechanism
Mutations can pass `meta: { silent: true }` to skip the overlay (for background/polling tasks like 5s job auto-refresh).

Apply `silent: true` to:
- `Jobs.tsx` 5-second auto-refresh queries (queries don't trigger this anyway, only mutations — but the per-row Retry should show overlay)
- Any background sync we don't want blocking

### 6. Custom messages for important ops
Slight enhancement in heavy mutations (DeployUserDialog, DeviceInspectorDialog, Backups) to call `start("ডিপ্লয় চলছে — অপেক্ষা করুন")` manually before invoke and `stop()` in onSettled, overriding the default generic message.

### Files
**New:**
- `src/components/GlobalLoadingOverlay.tsx`
- `src/stores/useGlobalLoading.ts`

**Edit:**
- `src/App.tsx` — QueryClient mutationCache + render overlay
- `src/components/device-admin/DeployUserDialog.tsx` — custom message
- `src/components/device-admin/DeviceInspectorDialog.tsx` — custom message
- `src/pages/dashboard/device-admin/Backups.tsx` — custom message
- `src/pages/dashboard/device-admin/Jobs.tsx` — custom message on Retry

### Result
- যেকোনো API call চলাকালীন হালকা blur overlay + spinner + Bangla message দেখাবে
- পুরো UI temporarily non-clickable → user accidentally multiple action trigger করতে পারবে না
- Existing code-এ minimal change (QueryClient level interception)
- Background queries unaffected (only mutations block)
