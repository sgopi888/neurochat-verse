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
$function$;