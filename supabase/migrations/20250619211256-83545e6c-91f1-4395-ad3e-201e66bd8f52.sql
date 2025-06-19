
-- Create table for user agreements and disclaimers
CREATE TABLE public.user_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_type TEXT NOT NULL DEFAULT 'terms_and_disclaimer',
  agreement_text TEXT NOT NULL,
  agreed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own agreements" ON public.user_agreements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agreements" ON public.user_agreements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_agreements_user_id ON public.user_agreements(user_id);
CREATE INDEX idx_user_agreements_type ON public.user_agreements(user_id, agreement_type);
