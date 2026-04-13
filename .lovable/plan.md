

## Phase 2: Strip SaaS Portal, Keep Core Infrastructure

### Summary
Remove all SaaS-specific landing page sections, Super Admin pages, and related routes while preserving the reusable foundation (UI components, theme, auth, Supabase client, layout system).

### What gets removed

**Landing page components** (delete files):
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/StatsSection.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/OLTFeatureSection.tsx`
- `src/components/landing/PortalsSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FAQSection.tsx`
- `src/components/landing/ContactSection.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/landing/LandingNavbar.tsx`

**Super Admin pages** (delete files):
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/ServiceRequests.tsx`
- `src/pages/admin/CustomerManagement.tsx`
- `src/pages/admin/PackageManager.tsx`
- `src/pages/admin/PaymentTracking.tsx`
- `src/pages/admin/CmsEditor.tsx`
- `src/pages/admin/FaqManager.tsx`

**Landing page** (delete):
- `src/pages/Landing.tsx`

### What gets modified

**`src/App.tsx`**: Remove all landing/admin imports and routes. Set `/` to redirect to `/login` (or a future ERP dashboard). Keep auth, theme, protected route, and dashboard layout wiring.

### What stays untouched
- All `src/components/ui/*` (shadcn components)
- `src/contexts/AuthContext.tsx` and `ThemeContext.tsx`
- `src/integrations/supabase/*`
- `src/components/DashboardLayout.tsx`, `AppSidebar.tsx`, `TopBar.tsx`, `ProtectedRoute.tsx`, `ThemeSwitcher.tsx`
- `src/pages/Login.tsx`, `ResetPassword.tsx`, `NotFound.tsx`
- All Supabase edge functions and migrations
- Tailwind config, Vite config, all tooling

### Technical details
- `App.tsx` will have `<Route path="/" element={<Navigate to="/login" />} />` as the root route
- A placeholder `/dashboard` route with a simple "ERP Dashboard coming soon" card will be added so login has somewhere to redirect
- The `ProtectedRoute` + `DashboardLayout` wrapper stays ready for ERP modules

