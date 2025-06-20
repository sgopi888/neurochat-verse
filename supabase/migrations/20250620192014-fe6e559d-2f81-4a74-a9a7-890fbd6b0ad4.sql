
-- First, drop and recreate the get_or_create_daily_usage function with better error handling
DROP FUNCTION IF EXISTS public.get_or_create_daily_usage(UUID);

CREATE OR REPLACE FUNCTION public.get_or_create_daily_usage(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  date DATE,
  chat_queries_count INTEGER,
  tts_requests_count INTEGER,
  monthly_chat_count INTEGER,
  monthly_tts_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_record RECORD;
  monthly_chat_total INTEGER;
  monthly_tts_total INTEGER;
BEGIN
  -- First, try to get existing record for today
  SELECT ul.id, ul.user_id, ul.date, ul.chat_queries_count, ul.tts_requests_count, ul.monthly_chat_count, ul.monthly_tts_count
  INTO existing_record
  FROM public.user_usage_limits ul
  WHERE ul.user_id = p_user_id AND ul.date = CURRENT_DATE;
  
  -- If record exists, return it
  IF FOUND THEN
    RETURN QUERY
    SELECT existing_record.id, existing_record.user_id, existing_record.date, 
           existing_record.chat_queries_count, existing_record.tts_requests_count,
           existing_record.monthly_chat_count, existing_record.monthly_tts_count;
    RETURN;
  END IF;
  
  -- If no record exists, calculate monthly totals and create one
  SELECT 
    COALESCE(SUM(ul.chat_queries_count), 0),
    COALESCE(SUM(ul.tts_requests_count), 0)
  INTO monthly_chat_total, monthly_tts_total
  FROM public.user_usage_limits ul
  WHERE ul.user_id = p_user_id 
  AND ul.date >= DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Insert new record with calculated monthly totals
  INSERT INTO public.user_usage_limits (user_id, date, chat_queries_count, tts_requests_count, monthly_chat_count, monthly_tts_count)
  VALUES (p_user_id, CURRENT_DATE, 0, 0, monthly_chat_total, monthly_tts_total)
  RETURNING ul.id, ul.user_id, ul.date, ul.chat_queries_count, ul.tts_requests_count, ul.monthly_chat_count, ul.monthly_tts_count
  INTO existing_record;
  
  -- Return the newly created record
  RETURN QUERY
  SELECT existing_record.id, existing_record.user_id, existing_record.date,
         existing_record.chat_queries_count, existing_record.tts_requests_count,
         existing_record.monthly_chat_count, existing_record.monthly_tts_count;
END;
$$;

-- Ensure RLS policies exist for chats table (these may already exist but we'll create them if they don't)
DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
  
  -- Try to create policies, ignore if they already exist
  BEGIN
    EXECUTE 'CREATE POLICY "Users can view their own chats" ON public.chats FOR SELECT USING (auth.uid() = user_id);';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    EXECUTE 'CREATE POLICY "Users can create their own chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    EXECUTE 'CREATE POLICY "Users can update their own chats" ON public.chats FOR UPDATE USING (auth.uid() = user_id);';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    EXECUTE 'CREATE POLICY "Users can delete their own chats" ON public.chats FOR DELETE USING (auth.uid() = user_id);';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
