-- Add new vendor enum values
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'dbc';
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'syrotech';
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'solitine';
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'corelink';
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'c-data';
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'ecom';
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'hsgq';
ALTER TYPE public.olt_vendor ADD VALUE IF NOT EXISTS 'phyhome';

-- Add columns to olt_devices for hardware monitoring
ALTER TABLE public.olt_devices
  ADD COLUMN IF NOT EXISTS cpu_usage numeric,
  ADD COLUMN IF NOT EXISTS memory_usage numeric,
  ADD COLUMN IF NOT EXISTS uptime text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS hardware_version text,
  ADD COLUMN IF NOT EXISTS firmware_version text,
  ADD COLUMN IF NOT EXISTS mac_address text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS total_onus integer,
  ADD COLUMN IF NOT EXISTS online_onus integer;

-- Add columns to onu_list for distance and offline reason
ALTER TABLE public.onu_list
  ADD COLUMN IF NOT EXISTS distance integer,
  ADD COLUMN IF NOT EXISTS offline_reason text;