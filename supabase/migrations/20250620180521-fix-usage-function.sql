
-- Fix the ambiguous column reference in get_or_create_daily_usage function
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
BEGIN
  -- Try to get existing record for today
  RETURN QUERY
  SELECT ul.id, ul.user_id, ul.date, ul.chat_queries_count, ul.tts_requests_count, ul.monthly_chat_count, ul.monthly_tts_count
  FROM public.user_usage_limits ul
  WHERE ul.user_id = p_user_id AND ul.date = CURRENT_DATE;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    -- Calculate monthly totals from this month's records
    WITH monthly_totals AS (
      SELECT 
        COALESCE(SUM(ul.chat_queries_count), 0) as total_chat,
        COALESCE(SUM(ul.tts_requests_count), 0) as total_tts
      FROM public.user_usage_limits ul
      WHERE ul.user_id = p_user_id 
      AND ul.date >= DATE_TRUNC('month', CURRENT_DATE)::DATE
    )
    INSERT INTO public.user_usage_limits (user_id, date, monthly_chat_count, monthly_tts_count)
    SELECT p_user_id, CURRENT_DATE, total_chat, total_tts
    FROM monthly_totals;
    
    -- Return the newly created record
    RETURN QUERY
    SELECT ul.id, ul.user_id, ul.date, ul.chat_queries_count, ul.tts_requests_count, ul.monthly_chat_count, ul.monthly_tts_count
    FROM public.user_usage_limits ul
    WHERE ul.user_id = p_user_id AND ul.date = CURRENT_DATE;
  END IF;
END;
$$;
