

User wants 3 changes to the dashboard top-right area:

1. **Remove the floating gear/settings button** (right edge, vertically centered) that currently opens the theme customizer — it shows the small "××" double-cross artifact in image-133.
2. **Split topbar icons into two separate buttons**:
   - **Theme icon** (palette/paintbrush) → opens the existing theme customizer (colors, mode, skin, content width)
   - **Quick Settings icon** (gear/settings) → opens a NEW Quick Settings panel matching the reference screenshot
3. The current `ThemeSwitcher` (sun/moon toggle) is fine to keep OR replace — user says "theme এর icon দিবা" so I'll replace the floating gear's role with a palette icon in the topbar that opens the customizer, and keep the sun/moon toggle.

### Quick Settings panel content (from reference image)
A right-side Sheet titled "QUICK SETTING" with these sections, each with radio options + Save button:
- Bill generate period (Start of month / Date to date)
- Allow inactive process at last day of month (Yes / No)
- Allow bandwidth POP invoice daily basis (Yes / No)
- Payment status wise client enable/disable (Yes / No)
- Show company name in invoice (Yes / No)
- Client code automatic or customizable (Customizable / Automatic)
- Send SMS to unpaid client before (1/2/3/5 days)
- Outside bill payment link enable/disable (Yes / No)
- Outside bill payment verification code (Yes / No)

Settings persist to existing `system_settings` table (already used by `useSystemSetting` hook). Each row keyed by setting name.

### Files to change

**`src/components/ThemeCustomizer.tsx`**
- Remove the floating `<button>` (fixed right edge gear) — that's the source of the "××" artifact
- Export the Sheet as a controlled component: accept `open` / `onOpenChange` props so TopBar can trigger it

**`src/components/QuickSettings.tsx`** (new)
- New Sheet component matching reference layout
- Reads/writes via `system_settings` table (use existing `useSystemSetting` hook pattern)
- Each section: label + info icon + radio options + Save button per section

**`src/components/TopBar.tsx`**
- Add two new icon buttons next to ThemeSwitcher:
  - `<Palette/>` → opens ThemeCustomizer
  - `<Settings/>` → opens QuickSettings
- Manage open state for both panels

**`src/components/DashboardLayout.tsx`**
- Remove standalone `<ThemeCustomizer />` mount (it now lives inside TopBar as controlled)

### Notes
- The "××" artifact in image-133 is the rotating gear icon from the floating button overlapping itself — removing the floating button fixes it.
- All Quick Settings are global (admin-level), stored in `system_settings`. RLS already restricts writes to admins.

