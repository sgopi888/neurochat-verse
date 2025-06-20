
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UsageData {
  id: string;
  user_id: string;
  date: string;
  chat_queries_count: number;
  tts_requests_count: number;
  monthly_chat_count: number;
  monthly_tts_count: number;
}

interface UsageLimits {
  dailyChatLimit: number;
  monthlyChatLimit: number;
  dailyTTSLimit: number;
}

interface UsageStats {
  dailyChatUsage: number;
  monthlyChatUsage: number;
  dailyTTSUsage: number;
  dailyChatRemaining: number;
  monthlyChatRemaining: number;
  dailyTTSRemaining: number;
  resetTime: string;
}

const DEFAULT_LIMITS: UsageLimits = {
  dailyChatLimit: 30,
  monthlyChatLimit: 300,
  dailyTTSLimit: 10,
};

export const useUsageMonitoring = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call the database function to get or create today's usage record
      const { data, error: fetchError } = await supabase
        .rpc('get_or_create_daily_usage', { p_user_id: user.id });

      if (fetchError) {
        console.error('Error fetching usage data:', fetchError);
        setError('Failed to load usage data');
        return;
      }

      if (data && data.length > 0) {
        setUsageData(data[0]);
      }
    } catch (err) {
      console.error('Usage data fetch failed:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [user]);

  const getUsageStats = (): UsageStats => {
    if (!usageData) {
      return {
        dailyChatUsage: 0,
        monthlyChatUsage: 0,
        dailyTTSUsage: 0,
        dailyChatRemaining: DEFAULT_LIMITS.dailyChatLimit,
        monthlyChatRemaining: DEFAULT_LIMITS.monthlyChatLimit,
        dailyTTSRemaining: DEFAULT_LIMITS.dailyTTSLimit,
        resetTime: 'Midnight UTC',
      };
    }

    return {
      dailyChatUsage: usageData.chat_queries_count,
      monthlyChatUsage: usageData.monthly_chat_count,
      dailyTTSUsage: usageData.tts_requests_count,
      dailyChatRemaining: Math.max(0, DEFAULT_LIMITS.dailyChatLimit - usageData.chat_queries_count),
      monthlyChatRemaining: Math.max(0, DEFAULT_LIMITS.monthlyChatLimit - usageData.monthly_chat_count),
      dailyTTSRemaining: Math.max(0, DEFAULT_LIMITS.dailyTTSLimit - usageData.tts_requests_count),
      resetTime: 'Midnight UTC',
    };
  };

  const isLimitExceeded = (type: 'chat' | 'tts' | 'monthly'): boolean => {
    if (!usageData) return false;

    switch (type) {
      case 'chat':
        return usageData.chat_queries_count >= DEFAULT_LIMITS.dailyChatLimit;
      case 'tts':
        return usageData.tts_requests_count >= DEFAULT_LIMITS.dailyTTSLimit;
      case 'monthly':
        return usageData.monthly_chat_count >= DEFAULT_LIMITS.monthlyChatLimit;
      default:
        return false;
    }
  };

  const getUsagePercentage = (type: 'chat' | 'tts' | 'monthly'): number => {
    if (!usageData) return 0;

    switch (type) {
      case 'chat':
        return Math.min(100, (usageData.chat_queries_count / DEFAULT_LIMITS.dailyChatLimit) * 100);
      case 'tts':
        return Math.min(100, (usageData.tts_requests_count / DEFAULT_LIMITS.dailyTTSLimit) * 100);
      case 'monthly':
        return Math.min(100, (usageData.monthly_chat_count / DEFAULT_LIMITS.monthlyChatLimit) * 100);
      default:
        return 0;
    }
  };

  return {
    usageData,
    loading,
    error,
    fetchUsageData,
    getUsageStats,
    isLimitExceeded,
    getUsagePercentage,
    limits: DEFAULT_LIMITS,
  };
};
