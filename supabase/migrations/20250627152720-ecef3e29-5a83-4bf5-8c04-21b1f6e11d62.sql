
-- Add columns to profiles table for anonymization and reactivation
ALTER TABLE public.profiles 
ADD COLUMN anonymized_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN reactivation_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN original_email_hash TEXT DEFAULT NULL;

-- Add expires_at column to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the cleanup function to handle the new anonymization system
CREATE OR REPLACE FUNCTION public.cleanup_old_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete chat sessions that have expired (past 90 days from anonymization)
  DELETE FROM public.chat_sessions 
  WHERE expires_at IS NOT NULL 
  AND expires_at < now();
  
  -- Delete profiles that are past the 30-day reactivation window
  DELETE FROM public.profiles 
  WHERE reactivation_expires_at IS NOT NULL 
  AND reactivation_expires_at < now();
  
  -- Keep the existing cleanup for old soft-deleted items (90 days)
  DELETE FROM public.chat_sessions 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < now() - interval '90 days';
  
  DELETE FROM public.profiles 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < now() - interval '90 days';
  
  -- Also delete chats that are older than 90 days even if not soft-deleted (safety measure)
  DELETE FROM public.chat_sessions 
  WHERE created_at < now() - interval '90 days'
  AND deleted_at IS NULL 
  AND expires_at IS NULL;
END;
$$;

-- Update RLS policies to exclude anonymized profiles and expired chats
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create updated RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL AND anonymized_at IS NULL);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL AND anonymized_at IS NULL);

-- Add RLS policies for chat_sessions to handle expired chats
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own non-expired chats" ON public.chat_sessions
  FOR SELECT USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL 
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Users can insert their own chats" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own non-expired chats" ON public.chat_sessions
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Add RLS policies for chat_messages to respect expired chats
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from non-expired chats" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_session_id 
      AND user_id = auth.uid()
      AND deleted_at IS NULL 
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

CREATE POLICY "Users can insert messages to their own chats" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = chat_session_id 
      AND user_id = auth.uid()
      AND deleted_at IS NULL 
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Create function to anonymize a user account
CREATE OR REPLACE FUNCTION public.anonymize_user_account(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_email TEXT;
  email_hash TEXT;
  anonymized_email TEXT;
BEGIN
  -- Get the original email from auth.users
  SELECT email INTO original_email FROM auth.users WHERE id = p_user_id;
  
  IF original_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Create hash of original email for reactivation matching
  email_hash := encode(digest(original_email, 'sha256'), 'hex');
  
  -- Create anonymized email
  anonymized_email := 'anonymized_user_' || extract(epoch from now())::bigint || '@internal.domain';
  
  -- Update auth.users with anonymized email
  UPDATE auth.users 
  SET email = anonymized_email, 
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Update profile with anonymization data
  UPDATE public.profiles 
  SET full_name = NULL,
      avatar_url = NULL,
      anonymized_at = now(),
      reactivation_expires_at = now() + interval '30 days',
      original_email_hash = email_hash,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Set expiration on all user's chat sessions (90 days)
  UPDATE public.chat_sessions 
  SET expires_at = now() + interval '90 days',
      updated_at = now()
  WHERE user_id = p_user_id 
  AND deleted_at IS NULL;
END;
$$;

-- Create function to check for reactivation possibility
CREATE OR REPLACE FUNCTION public.check_reactivation_possibility(p_email TEXT)
RETURNS TABLE(
  user_id UUID,
  can_reactivate BOOLEAN,
  anonymized_profile_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_hash TEXT;
  profile_record RECORD;
BEGIN
  -- Create hash of the email to check
  email_hash := encode(digest(p_email, 'sha256'), 'hex');
  
  -- Look for anonymized profile with matching email hash
  SELECT p.id, p.anonymized_at, p.reactivation_expires_at
  INTO profile_record
  FROM public.profiles p
  WHERE p.original_email_hash = email_hash
  AND p.anonymized_at IS NOT NULL
  AND p.reactivation_expires_at > now()
  LIMIT 1;
  
  IF profile_record.id IS NOT NULL THEN
    RETURN QUERY SELECT 
      profile_record.id,
      true,
      profile_record.id;
  ELSE
    RETURN QUERY SELECT 
      NULL::UUID,
      false,
      NULL::UUID;
  END IF;
END;
$$;

-- Create function to reactivate an anonymized account
CREATE OR REPLACE FUNCTION public.reactivate_user_account(p_profile_id UUID, p_original_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Restore original email in auth.users
  UPDATE auth.users 
  SET email = p_original_email,
      updated_at = now()
  WHERE id = p_profile_id;
  
  -- Clear anonymization data from profile
  UPDATE public.profiles 
  SET anonymized_at = NULL,
      reactivation_expires_at = NULL,
      original_email_hash = NULL,
      updated_at = now()
  WHERE id = p_profile_id;
  
  -- Clear expiration from chat sessions (make them accessible again)
  UPDATE public.chat_sessions 
  SET expires_at = NULL,
      updated_at = now()
  WHERE user_id = p_profile_id 
  AND expires_at IS NOT NULL;
END;
$$;
