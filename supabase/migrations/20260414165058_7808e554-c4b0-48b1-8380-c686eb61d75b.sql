-- Add source column to income_entries for tracking income type
ALTER TABLE public.income_entries 
ADD COLUMN source text NOT NULL DEFAULT 'client_billing';

-- Add category column to expense_entries for categorization
ALTER TABLE public.expense_entries 
ADD COLUMN category text;

-- Add status columns
ALTER TABLE public.income_entries ADD COLUMN status text NOT NULL DEFAULT 'active';
ALTER TABLE public.expense_entries ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add month column for period tracking
ALTER TABLE public.income_entries ADD COLUMN month text;
ALTER TABLE public.expense_entries ADD COLUMN month text;

-- Add client_id to income for linking to client billing
ALTER TABLE public.income_entries ADD COLUMN client_id uuid REFERENCES public.clients(id);

-- Add branch_id for branch-level tracking
ALTER TABLE public.income_entries ADD COLUMN branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.expense_entries ADD COLUMN branch_id uuid REFERENCES public.branches(id);

-- Add paid_by / received_by
ALTER TABLE public.expense_entries ADD COLUMN paid_by text;
ALTER TABLE public.income_entries ADD COLUMN received_by text;

-- Add payment_method
ALTER TABLE public.income_entries ADD COLUMN payment_method text;
ALTER TABLE public.expense_entries ADD COLUMN payment_method text;