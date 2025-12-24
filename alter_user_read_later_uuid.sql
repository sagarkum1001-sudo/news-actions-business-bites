ALTER TABLE public.user_read_later ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
