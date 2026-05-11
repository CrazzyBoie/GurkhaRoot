import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { toast } from 'sonner';

export function GoogleCallback() {
  const { loginWithToken } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('token');

    if (!token) {
      const searchParams = new URLSearchParams(window.location.search);
      const error = searchParams.get('error');
      console.error('[GoogleCallback] No token in hash. Error:', error);
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => {
        toast.success('Signed in with Google!');
        // Small delay to guarantee Zustand has flushed state to localStorage
        // before App.tsx's fetchUser() runs on the home page mount.
        setTimeout(() => navigate('/', { replace: true }), 100);
      })
      .catch((err) => {
        console.error('[GoogleCallback] loginWithToken failed:', err?.response?.data || err);
        toast.error('Google sign-in failed. Please try again.');
        navigate('/login', { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#555] text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}