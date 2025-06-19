
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DISCLAIMER_TEXT } from '@/components/DisclaimerModal';

export const useUserAgreement = () => {
  const { user } = useAuth();
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkUserAgreement();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const checkUserAgreement = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', user.id)
        .eq('agreement_type', 'terms_and_disclaimer')
        .order('agreed_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking user agreement:', error);
        setHasAccepted(false);
      } else {
        setHasAccepted(data && data.length > 0);
      }
    } catch (error) {
      console.error('Error checking user agreement:', error);
      setHasAccepted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserAgreement = async () => {
    if (!user) return false;

    try {
      // Get user's IP and user agent for audit trail
      const userAgent = navigator.userAgent;
      
      const { error } = await supabase
        .from('user_agreements')
        .insert({
          user_id: user.id,
          agreement_type: 'terms_and_disclaimer',
          agreement_text: DISCLAIMER_TEXT,
          user_agent: userAgent
        });

      if (error) {
        console.error('Error saving user agreement:', error);
        return false;
      }

      setHasAccepted(true);
      return true;
    } catch (error) {
      console.error('Error saving user agreement:', error);
      return false;
    }
  };

  return {
    hasAccepted,
    isLoading,
    saveUserAgreement,
    checkUserAgreement
  };
};
