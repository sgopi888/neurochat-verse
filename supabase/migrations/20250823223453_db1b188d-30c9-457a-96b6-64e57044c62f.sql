-- Update the get_or_create_daily_usage function to enforce 20 requests/day limit
CREATE OR REPLACE FUNCTION public.get_or_create_daily_usage(p_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, date date, chat_queries_count integer, tts_requests_count integer, monthly_chat_count integer, monthly_tts_count integer, limit_reached boolean, remaining_requests integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  existing_record RECORD;
  monthly_chat_total INTEGER;
  monthly_tts_total INTEGER;
  daily_limit INTEGER := 20;
BEGIN
  -- First, try to get existing record for today
  SELECT ul.id, ul.user_id, ul.date, ul.chat_queries_count, ul.tts_requests_count, ul.monthly_chat_count, ul.monthly_tts_count
  INTO existing_record
  FROM public.user_usage_limits ul
  WHERE ul.user_id = p_user_id AND ul.date = CURRENT_DATE;
  
  -- If record exists, return it with limit status
  IF FOUND THEN
    RETURN QUERY
    SELECT existing_record.id, existing_record.user_id, existing_record.date, 
           existing_record.chat_queries_count, existing_record.tts_requests_count,
           existing_record.monthly_chat_count, existing_record.monthly_tts_count,
           (existing_record.chat_queries_count >= daily_limit) as limit_reached,
           GREATEST(0, daily_limit - existing_record.chat_queries_count) as remaining_requests;
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
  
  -- Return the newly created record with limit status
  RETURN QUERY
  SELECT existing_record.id, existing_record.user_id, existing_record.date,
         existing_record.chat_queries_count, existing_record.tts_requests_count,
         existing_record.monthly_chat_count, existing_record.monthly_tts_count,
         false as limit_reached,
         daily_limit as remaining_requests;
END;
$function$

-- Function to increment chat usage and check limit
CREATE OR REPLACE FUNCTION public.increment_chat_usage(p_user_id uuid)
 RETURNS TABLE(success boolean, remaining_requests integer, limit_reached boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  daily_limit INTEGER := 20;
  current_count INTEGER;
  usage_record RECORD;
BEGIN
  -- Get or create daily usage record
  SELECT * INTO usage_record 
  FROM public.get_or_create_daily_usage(p_user_id) 
  LIMIT 1;
  
  -- Check if already at limit
  IF usage_record.limit_reached THEN
    RETURN QUERY SELECT false, 0, true;
    RETURN;
  END IF;
  
  -- Increment the count
  UPDATE public.user_usage_limits 
  SET chat_queries_count = chat_queries_count + 1,
      monthly_chat_count = monthly_chat_count + 1,
      updated_at = now()
  WHERE user_id = p_user_id AND date = CURRENT_DATE
  RETURNING chat_queries_count INTO current_count;
  
  -- Return success with updated counts
  RETURN QUERY SELECT 
    true as success,
    GREATEST(0, daily_limit - current_count) as remaining_requests,
    (current_count >= daily_limit) as limit_reached;
END;
$function$