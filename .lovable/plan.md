## Goal
Trim the uploaded ISP Desk image so only the logo mark (the blue "iD + wifi" icon) remains — drop all surrounding white space and the "ISP DESK" wordmark, then use it across the app.

## Steps

1. **Crop the icon-only logo using ImageMagick**
   - Take `user-uploads://ISP_Desk_Logo-2.png` (1536×1024, mostly white).
   - Crop to the icon mark region only (approx left 13%–28%, top 32%–66% of the source).
   - Run `-trim +repage` to remove any remaining white border, then `-resize` to a clean square (e.g. 512×512) on a transparent background.
   - Save as `src/assets/isp-desk-logo.png` (overwrite existing) and `public/isp-desk-logo.png`.

2. **Adjust sidebar sizing**
   - The existing sidebar uses `h-12 w-auto` for the logo (sized for the wide wordmark version). With the square icon-only mark, switch to `h-10 w-10` (expanded) and `h-9 w-9` (collapsed) so it sits centred without looking oversized.

3. **Other surfaces — no code change needed**
   - `Login.tsx`, `PublicNavbar.tsx`, `PublicFooter.tsx` already point to the same `@/assets/isp-desk-logo.png`. Replacing the file automatically updates them. Will visually QA each after the swap.

## Out of scope
- Favicon / `index.html` icons (current request is about the in-app logo only).
- Re-adding "ISP Desk / ERP System" text next to the sidebar logo (already removed per previous instruction).
