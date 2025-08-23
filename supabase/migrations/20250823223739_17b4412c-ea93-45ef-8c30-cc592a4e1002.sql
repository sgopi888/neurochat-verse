-- Create function to increment chat usage and check limits
CREATE OR REPLACE FUNCTION public.increment_chat_usage(p_user_id uuid)
RETURNS TABLE(success boolean, remaining_requests integer, limit_reached boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_usage INTEGER;
  daily_limit INTEGER := 20;
BEGIN
  -- Get or create today's usage record
  INSERT INTO public.user_usage_limits (user_id, date, chat_queries_count, tts_requests_count)
  VALUES (p_user_id, CURRENT_DATE, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  -- Get current usage
  SELECT chat_queries_count INTO current_usage
  FROM public.user_usage_limits
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  -- Check if limit already reached
  IF current_usage >= daily_limit THEN
    RETURN QUERY SELECT false, 0, true;
    RETURN;
  END IF;
  
  -- Increment usage count
  UPDATE public.user_usage_limits
  SET chat_queries_count = chat_queries_count + 1,
      updated_at = now()
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  -- Return success with updated counts
  RETURN QUERY 
  SELECT true, 
         GREATEST(0, daily_limit - (current_usage + 1)),
         (current_usage + 1) >= daily_limit;
END;
$function$;