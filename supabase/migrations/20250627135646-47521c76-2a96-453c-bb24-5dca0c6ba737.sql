
-- Add deleted_at column to profiles table for soft deletion
ALTER TABLE public.profiles 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the cleanup function to also handle soft-deleted profiles
CREATE OR REPLACE FUNCTION public.cleanup_old_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete chats that were soft-deleted more than 90 days ago
  DELETE FROM public.chat_sessions 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < now() - interval '90 days';
  
  -- Also delete chats that are older than 90 days even if not soft-deleted (safety measure)
  DELETE FROM public.chat_sessions 
  WHERE created_at < now() - interval '90 days';
  
  -- Delete profiles that were soft-deleted more than 90 days ago
  DELETE FROM public.profiles 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < now() - interval '90 days';
END;
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to exclude soft-deleted profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
