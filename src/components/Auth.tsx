import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Bot, ArrowLeft, ExternalLink } from 'lucide-react';
import { DISCLAIMER_TEXT } from '@/components/DisclaimerModal';
import DisclaimerModal from '@/components/DisclaimerModal';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasReadAgreement, setHasReadAgreement] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasSpecialChar: false,
    isValid: false
  });
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Enhanced special character regex - includes all common special characters
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;

  const validatePassword = (pwd: string): PasswordValidation => {
    const minLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasSpecialChar = specialCharRegex.test(pwd);
    const isValid = minLength && hasUppercase && hasSpecialChar;

    return {
      minLength,
      hasUppercase,
      hasSpecialChar,
      isValid
    };
  };

  // Real-time password validation on every keystroke
  useEffect(() => {
    if (isSignUp) {
      const validation = validatePassword(password);
      setPasswordValidation(validation);
    }
  }, [password, isSignUp]);

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
        const finalValidation = validatePassword(password);

        if (!hasReadAgreement) {
          toast.error('Please read and agree to the terms and disclaimer');
          setIsLoading(false);
          return;
        }

        if (!finalValidation.isValid) {
          const missingRequirements = [];
          if (!finalValidation.minLength) {
            missingRequirements.push('at least 8 characters');
          }
          if (!finalValidation.hasUppercase) {
            missingRequirements.push('one uppercase letter');
          }
          if (!finalValidation.hasSpecialChar) {
            missingRequirements.push('one special character');
          }

          const errorMessage = `Password must contain: ${missingRequirements.join(', ')}`;
          toast.error(errorMessage);
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

  const handleDisclaimerAccept = () => {
    setHasReadAgreement(true);
    setShowDisclaimerModal(false);
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-[var(--gradient-bg)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border">
          <CardHeader className="text-center space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="bg-gradient-to-r from-primary to-accent p-3 rounded-full">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-primary">NeuroChat</h1>
            </div>
            <CardTitle className="text-2xl text-foreground">Reset Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border text-foreground"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-primary-foreground" 
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
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
    <>
      <div className="min-h-screen bg-[var(--gradient-bg)] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-border">
          <CardHeader className="text-center space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-gradient-to-r from-primary to-accent p-4 rounded-full">
                <Bot className="h-10 w-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                NeuroChat
              </h1>
            </div>
            <CardTitle className="text-2xl text-foreground">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp 
                ? 'Sign up to start using NeuroChat Meditative Process Generator' 
                : 'Sign in to access your meditation sessions'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isSignUp}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isSignUp ? 8 : 6}
                    className={`bg-input border-border text-foreground ${
                      isSignUp && password ? (
                        passwordValidation.isValid ? 'border-green-500' : 'border-red-500'
                      ) : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Show password validation errors only when password doesn't meet requirements */}
                {isSignUp && password && !passwordValidation.isValid && (
                  <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-medium">Password must contain:</p>
                    <ul className="text-sm text-destructive mt-1 space-y-1">
                      {!passwordValidation.minLength && <li>• At least 8 characters</li>}
                      {!passwordValidation.hasUppercase && <li>• One uppercase letter</li>}
                      {!passwordValidation.hasSpecialChar && <li>• One special character</li>}
                    </ul>
                  </div>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg text-foreground">Terms & Agreement</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasReadAgreement"
                        checked={hasReadAgreement}
                        onCheckedChange={(checked) => setHasReadAgreement(checked as boolean)}
                      />
                      <label
                        htmlFor="hasReadAgreement"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground flex items-center"
                      >
                        I have read and understood the{' '}
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto ml-1 text-primary hover:text-accent"
                          onClick={() => setShowDisclaimerModal(true)}
                        >
                          disclaimer and terms
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-primary-foreground" 
                disabled={isLoading || (isSignUp && (!hasReadAgreement || !passwordValidation.isValid))}
              >
                {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
            </form>

            <div className="space-y-2 text-center">
              {!isSignUp && (
                <Button
                  variant="link"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Forgot your password?
                </Button>
              )}
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-foreground"
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

      <DisclaimerModal
        isOpen={showDisclaimerModal}
        onAccept={handleDisclaimerAccept}
        onDecline={() => setShowDisclaimerModal(false)}
        onAgree={handleDisclaimerAccept}
      />
    </>
  );
};

export default Auth;