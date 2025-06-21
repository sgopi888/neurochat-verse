
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting cleanup of old chats...');

    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the existing cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_chats');

    if (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }

    console.log('Cleanup completed successfully');

    // Also cleanup old rate limits and user agreements if needed
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Clean up old rate limit records (older than 30 days)
    const { error: rateLimitsError } = await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (rateLimitsError) {
      console.warn('Error cleaning up rate limits:', rateLimitsError);
    } else {
      console.log('Rate limits cleanup completed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed successfully',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Cleanup function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
