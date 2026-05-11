import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'email' | 'password' | 'both' | null>(null);

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      if (!email && !password) {
        setLoginError('Please enter your email and password.');
        setErrorField('both');
      } else if (!email) {
        setLoginError('Please enter your email address.');
        setErrorField('email');
      } else {
        setLoginError('Please enter your password.');
        setErrorField('password');
      }
      return;
    }

    setIsLoading(true);
    setLoginError(null);
    setErrorField(null);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error: any) {
      const msg: string = error.response?.data?.message || 'Login failed. Please try again.';

      // Determine which field to highlight based on the error message
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no account')) {
        setErrorField('email');
      } else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong')) {
        setErrorField('password');
      } else {
        // "Invalid email or password" — highlight both
        setErrorField('both');
      }

      setLoginError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  const clearError = () => {
    setLoginError(null);
    setErrorField(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border shadow-2xl flag-card">
        <CardHeader className="text-center">
          <CardTitle
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            WELCOME BACK
          </CardTitle>
          <CardDescription className="text-blue-200">
            Sign in to your Gurkha Roots account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-sm text-blue-200">
              or
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Inline error banner ── */}
            {loginError && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${errorField === 'email' || errorField === 'both' ? 'text-red-400' : 'text-blue-200'}`} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="you@example.com"
                  className={`pl-10 ${errorField === 'email' || errorField === 'both' ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </div>
              {(errorField === 'email') && (
                <p className="mt-1 text-xs text-red-400">No account found with this email address.</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${errorField === 'password' || errorField === 'both' ? 'text-red-400' : 'text-blue-200'}`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  className={`pl-10 ${errorField === 'password' || errorField === 'both' ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorField === 'password' && (
                <p className="mt-1 text-xs text-red-400">
                  Incorrect password.{' '}
                  <Link to="/forgot-password" className="underline hover:text-red-300">
                    Reset it here.
                  </Link>
                </p>
              )}
              {errorField === 'both' && (
                <p className="mt-1 text-xs text-red-400">
                  Check your email and password and try again.{' '}
                  <Link to="/forgot-password" className="underline hover:text-red-300">
                    Forgot password?
                  </Link>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-blue-200">
                <input type="checkbox" className="w-4 h-4" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-[#DC143C] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full text-white hover:opacity-90 btn-flag"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-blue-200">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#DC143C] hover:underline font-medium">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}