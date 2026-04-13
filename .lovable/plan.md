

# Phase 2: ISP ERP Software (New Project)

## Step 1: Create the New Project
You need to **remix this current project** to create a new Lovable project. This will carry over all UI components, Tailwind config, and shadcn/ui setup.

**How to remix:**
- Click the project name (top left) → Settings → "Remix this project"
- Name it something like "ISP Desk ERP"

## Step 2: What We'll Do in the New Project

Once the remix is created, open it and tell me to start. I will:

### A. Strip SaaS Portal Pages
- Remove landing page sections (Hero, Features, Pricing, FAQ, Contact)
- Remove Super Admin pages (CMS, Customer Management, Service Requests)
- Keep: UI components, theme system, auth context, Supabase client

### B. Multi-Tenant Login Flow
- New login page: ISP/ASP name field + email + password
- Tenant resolution from subdomain (e.g., `myisp.ispdesk.com`) or manual selection
- Store `tenant_id` in auth context for all subsequent queries

### C. Database Changes (in new project's Supabase)
- Create `tenants` table (id, name, subdomain, settings, logo, theme)
- Add `tenant_id` column to ALL ERP tables (clients, billing, employees, etc.)
- RLS policies: every query filtered by `tenant_id` matching logged-in user's tenant
- Security definer function: `get_user_tenant(user_id)` returns tenant_id

### D. Restore ERP Modules
- Re-create all deleted ERP pages (HR, Billing, Inventory, Accounting, Network, OLT, etc.)
- Sidebar with full ERP navigation (same modules as before)
- Every data query includes `.eq('tenant_id', currentTenantId)`

### E. ISP Public Website (External)
- Route: `/site` or subdomain-based public pages
- Template sections: Hero, Packages, Coverage Area, Contact, Customer Portal login
- Configurable per tenant from admin panel (logo, colors, packages)
- Customer self-service: check bill, pay online, raise ticket

## Step 3: Connect Both Projects
- Shared Supabase database (same project ref)
- When Super Admin approves a service request in Project 1 → creates tenant record accessible by Project 2
- Edge function for provisioning (create tenant config, default data)

## Your Action Now
1. **Remix this project** to create "ISP Desk ERP"
2. **Connect the same Supabase project** to the remix (so they share the database)
3. Open the new project and tell me to start Phase 2 implementation

