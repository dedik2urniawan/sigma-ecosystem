-- Add uploaded_at column to data_insiden_stunting
ALTER TABLE public.data_insiden_stunting 
ADD COLUMN IF NOT EXISTS uploaded_at timestamptz DEFAULT now();
