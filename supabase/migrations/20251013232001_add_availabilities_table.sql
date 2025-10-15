-- Add availabilities table for managing reservation availability and cut-off times
-- Default assumption: If a date/type/category is not present in this table, then it's available
set search_path = public;

-- Create availabilities table
CREATE TABLE IF NOT EXISTS public.availabilities (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  res_type reservation_type NOT NULL,
  category TEXT, -- For sub-categories within types (optional)
  available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT, -- Optional reason for unavailability
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique combinations
  UNIQUE(date, res_type, category)
);

-- Add comments for clarity
COMMENT ON TABLE public.availabilities IS 'Manages availability overrides for specific dates, types, and categories. Default assumption: if not present, then available.';
COMMENT ON COLUMN public.availabilities.date IS 'The date for which availability is being managed';
COMMENT ON COLUMN public.availabilities.res_type IS 'Type of reservation (pool, open_water, classroom)';
COMMENT ON COLUMN public.availabilities.category IS 'Optional sub-category within the reservation type';
COMMENT ON COLUMN public.availabilities.available IS 'Whether this date/type/category is available for reservations';
COMMENT ON COLUMN public.availabilities.reason IS 'Optional reason for unavailability (maintenance, event, etc.)';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_availabilities_lookup 
ON public.availabilities(date, res_type, category);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_availabilities_date 
ON public.availabilities(date);

-- Enable RLS
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read availability information
CREATE POLICY "Users can read availabilities" ON public.availabilities
  FOR SELECT USING (true);

-- Only admins can manage availability
CREATE POLICY "Admins can manage availabilities" ON public.availabilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE uid = auth.uid() 
      AND 'admin' = ANY(privileges)
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_availabilities_updated_at
  BEFORE UPDATE ON public.availabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
