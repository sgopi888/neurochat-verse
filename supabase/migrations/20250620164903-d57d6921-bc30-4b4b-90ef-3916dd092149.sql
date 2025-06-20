
-- Add deleted_at column to chats table for soft deletes
ALTER TABLE public.chats ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the existing RLS policies to exclude soft-deleted chats
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Create function to permanently delete chats older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_chats()
RETURNS void AS $$
BEGIN
  -- Delete chats that were soft-deleted more than 90 days ago
  DELETE FROM public.chats 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < now() - interval '90 days';
  
  -- Also delete chats that are older than 90 days even if not soft-deleted (safety measure)
  DELETE FROM public.chats 
  WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup function to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-chats',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT public.cleanup_old_chats();'
);
