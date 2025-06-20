
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Volume2, Calendar, AlertTriangle } from 'lucide-react';
import { useUsageMonitoring } from '@/hooks/useUsageMonitoring';

const UsageDisplay: React.FC = () => {
  const { loading, error, getUsageStats, getUsagePercentage, isLimitExceeded } = useUsageMonitoring();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Usage Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const stats = getUsageStats();
  const chatPercentage = getUsagePercentage('chat');
  const ttsPercentage = getUsagePercentage('tts');
  const monthlyPercentage = getUsagePercentage('monthly');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          Usage Statistics
        </CardTitle>
        <CardDescription>
          Track your daily and monthly usage limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Chat Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Daily Chat Queries</span>
              {isLimitExceeded('chat') && (
                <Badge variant="destructive" className="text-xs">
                  Limit Reached
                </Badge>
              )}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {stats.dailyChatUsage} / 30
            </span>
          </div>
          <Progress 
            value={chatPercentage} 
            className={`h-2 ${isLimitExceeded('chat') ? 'bg-red-100' : ''}`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.dailyChatRemaining} queries remaining today
          </p>
        </div>

        {/* Daily TTS Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Daily Text-to-Speech</span>
              {isLimitExceeded('tts') && (
                <Badge variant="destructive" className="text-xs">
                  Limit Reached
                </Badge>
              )}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {stats.dailyTTSUsage} / 10
            </span>
          </div>
          <Progress 
            value={ttsPercentage} 
            className={`h-2 ${isLimitExceeded('tts') ? 'bg-red-100' : ''}`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.dailyTTSRemaining} requests remaining today
          </p>
        </div>

        {/* Monthly Chat Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Monthly Chat Queries</span>
              {isLimitExceeded('monthly') && (
                <Badge variant="destructive" className="text-xs">
                  Limit Reached
                </Badge>
              )}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {stats.monthlyChatUsage} / 300
            </span>
          </div>
          <Progress 
            value={monthlyPercentage} 
            className={`h-2 ${isLimitExceeded('monthly') ? 'bg-red-100' : ''}`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.monthlyChatRemaining} queries remaining this month
          </p>
        </div>

        {/* Reset Information */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Daily limits reset at {stats.resetTime}
          </p>
        </div>

        {/* Warning Messages */}
        {(isLimitExceeded('chat') || isLimitExceeded('tts') || isLimitExceeded('monthly')) && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                Usage limits reached
              </p>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Some features may be temporarily unavailable until limits reset.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageDisplay;
