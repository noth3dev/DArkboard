-- Allow all authenticated users (Level 0+) to view legacy records
DROP POLICY IF EXISTS "Users can view legacy records" ON public.legacy_records;
CREATE POLICY "Users can view legacy records" ON public.legacy_records
    FOR SELECT TO authenticated
    USING (true);

-- Allow Level 1+ users to insert/update legacy records
DROP POLICY IF EXISTS "Admins can manage legacy records" ON public.legacy_records;

CREATE POLICY "Level 1+ can insert legacy records" ON public.legacy_records
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.user_uuid = auth.uid()
            AND users.access_level >= 1
        )
    );

CREATE POLICY "Level 1+ can update legacy records" ON public.legacy_records
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.user_uuid = auth.uid()
            AND users.access_level >= 1
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.user_uuid = auth.uid()
            AND users.access_level >= 1
        )
    );

-- Only Level 2 (Admin) can delete legacy records
CREATE POLICY "Admins can delete legacy records" ON public.legacy_records
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.user_uuid = auth.uid()
            AND users.access_level >= 2
        )
    );
