
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Bot, ArrowLeft } from 'lucide-react';
import { DISCLAIMER_TEXT } from '@/components/DisclaimerModal';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasReadAgreement, setHasReadAgreement] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

  const saveUserAgreement = async (userId: string) => {
    try {
      const userAgent = navigator.userAgent;
      
      const { error } = await supabase
        .from('user_agreements')
        .insert({
          user_id: userId,
          agreement_type: 'terms_and_disclaimer',
          agreement_text: DISCLAIMER_TEXT,
          user_agent: userAgent
        });

      if (error) {
        console.error('Error saving user agreement:', error);
      }
    } catch (error) {
      console.error('Error saving user agreement:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!hasReadAgreement || !hasAgreedToTerms) {
          toast.error('Please read and agree to the terms and disclaimer');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            }
          }
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          // Save user agreement if signup was successful
          if (data.user) {
            await saveUserAgreement(data.user.id);
          }
          toast.success('Account created successfully! Please check your email to verify your account.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Signed in successfully!');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset email sent! Check your inbox.');
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Sign up to start chatting with NeuroChat' 
              : 'Sign in to access your chat history'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Important Disclaimer & Terms</h3>
                  <ScrollArea className="h-32 w-full border rounded-md p-3 bg-gray-50">
                    <div className="text-xs leading-relaxed space-y-2">
                      {DISCLAIMER_TEXT.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="text-gray-700">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasReadAgreement"
                        checked={hasReadAgreement}
                        onCheckedChange={(checked) => setHasReadAgreement(checked as boolean)}
                      />
                      <label
                        htmlFor="hasReadAgreement"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I have read and understood the disclaimer above
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasAgreedToTerms"
                        checked={hasAgreedToTerms}
                        onCheckedChange={(checked) => setHasAgreedToTerms(checked as boolean)}
                      />
                      <label
                        htmlFor="hasAgreedToTerms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree to the terms and acknowledge that this platform does not provide medical or therapeutic services
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={isLoading || (isSignUp && (!hasReadAgreement || !hasAgreedToTerms))}
            >
              {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center">
            {!isSignUp && (
              <Button
                variant="link"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm"
              >
                Forgot your password?
              </Button>
            )}
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
