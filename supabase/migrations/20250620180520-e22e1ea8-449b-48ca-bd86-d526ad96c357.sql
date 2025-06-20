
-- Create user_usage_limits table to track daily and monthly usage
CREATE TABLE public.user_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  chat_queries_count INTEGER NOT NULL DEFAULT 0,
  tts_requests_count INTEGER NOT NULL DEFAULT 0,
  monthly_chat_count INTEGER NOT NULL DEFAULT 0,
  monthly_tts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create index for efficient lookups
CREATE INDEX idx_user_usage_limits_user_date ON public.user_usage_limits(user_id, date);
CREATE INDEX idx_user_usage_limits_user_monthly ON public.user_usage_limits(user_id, date DESC);

-- Enable RLS
ALTER TABLE public.user_usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own usage data
CREATE POLICY "Users can view their own usage limits" 
  ON public.user_usage_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for service role to manage usage limits
CREATE POLICY "Service role can manage usage limits" 
  ON public.user_usage_limits 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Create function to get or create daily usage record
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
        COALESCE(SUM(chat_queries_count), 0) as total_chat,
        COALESCE(SUM(tts_requests_count), 0) as total_tts
      FROM public.user_usage_limits
      WHERE user_id = p_user_id 
      AND date >= DATE_TRUNC('month', CURRENT_DATE)::DATE
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
