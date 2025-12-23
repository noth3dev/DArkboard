-- Create legacy_records table with expanded fields
DROP TABLE IF EXISTS public.legacy_records;

CREATE TABLE public.legacy_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_name TEXT NOT NULL,
    organization TEXT,
    award_name TEXT NOT NULL,
    award_date DATE NOT NULL,
    prize_money TEXT,
    team_members TEXT,
    description TEXT,
    image_urls TEXT[] DEFAULT '{}',
    user_uuid UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.legacy_records ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone (level 1+) can view
CREATE POLICY "Users can view legacy records" ON public.legacy_records
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.user_uuid = auth.uid()
            AND users.access_level >= 1
        )
    );

-- Only level 2 (Admin) can manage
CREATE POLICY "Admins can manage legacy records" ON public.legacy_records
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.user_uuid = auth.uid()
            AND users.access_level >= 2
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.user_uuid = auth.uid()
            AND users.access_level >= 2
        )
    );

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_legacy_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger
CREATE TRIGGER handle_updated_at_legacy
    BEFORE UPDATE ON public.legacy_records
    FOR EACH ROW
    EXECUTE FUNCTION update_legacy_records_updated_at();

-- Ensure storage bucket for legacy images exists
-- (This part usually run in SQL Editor manually or already exists)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('legacy', 'legacy', true) ON CONFLICT (id) DO NOTHING;
