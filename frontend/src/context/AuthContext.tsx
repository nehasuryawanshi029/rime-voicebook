'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl, safeParseJson } from '@/lib/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isGuest: boolean;
  guestId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    username: string;
    email: string;
    password: string;
    name?: string;
  }) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  exitGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load auth state from storage on initial mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('voicebook_auth_token');
      const storedUser = localStorage.getItem('voicebook_user');
      const storedIsGuest = localStorage.getItem('voicebook_is_guest');
      const storedGuestId = localStorage.getItem('voicebook_guest_id');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsGuest(false);
        setGuestId(null);
      } else if (storedIsGuest === 'true' && storedGuestId) {
        setIsGuest(true);
        setGuestId(storedGuestId);
        setUser(null);
        setToken(null);
      } else {
        setUser(null);
        setToken(null);
        setIsGuest(false);
        setGuestId(null);
      }
    } catch (e) {
      console.warn('Error reading auth state from storage:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const baseUrl = getApiBaseUrl();
      const loginPayload = JSON.stringify({
        username_or_email: usernameOrEmail.trim(),
        password: password,
      });

      const attemptFetch = async (targetUrl: string) => {
        return await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: loginPayload,
        });
      };

      let res: Response | null = null;
      let networkError: any = null;

      try {
        res = await attemptFetch(`${baseUrl}/api/auth/login`);
      } catch (err: any) {
        networkError = err;
        console.warn(`[VoiceBook Auth] Primary fetch to ${baseUrl}/api/auth/login failed:`, err);

        // Resilient fallback for local dev: if primary was a direct port 8000 attempt, try relative /api/auth/login
        // or loopback 127.0.0.1:8000 to overcome Windows localhost/IPv6/CORS blocks
        if (typeof window !== 'undefined') {
          const fallbacks = ['/api/auth/login', 'http://127.0.0.1:8000/api/auth/login'].filter(
            (fb) => fb !== `${baseUrl}/api/auth/login`
          );

          for (const fallbackUrl of fallbacks) {
            try {
              res = await attemptFetch(fallbackUrl);
              if (res) {
                networkError = null;
                break;
              }
            } catch (fallbackErr) {
              console.warn(`[VoiceBook Auth] Fallback fetch to ${fallbackUrl} failed:`, fallbackErr);
            }
          }
        }
      }

      if (!res) {
        return {
          success: false,
          error:
            networkError?.message === 'Failed to fetch'
              ? 'Unable to connect to backend server. Please verify the backend is running on port 8000.'
              : (networkError?.message || 'Unable to connect to VoiceBook authentication service.'),
        };
      }

      const { data, error: parseError } = await safeParseJson(res);

      if (!res.ok) {
        return {
          success: false,
          error:
            data?.detail ||
            parseError ||
            'Invalid username/email or password. Please try again.',
        };
      }

      if (!data || !data.token || !data.user) {
        return {
          success: false,
          error: 'Unexpected response received from authentication service.',
        };
      }

      setUser(data.user);
      setToken(data.token);
      setIsGuest(false);
      setGuestId(null);

      localStorage.setItem('voicebook_auth_token', data.token);
      localStorage.setItem('voicebook_user', JSON.stringify(data.user));
      localStorage.removeItem('voicebook_is_guest');
      localStorage.removeItem('voicebook_guest_id');

      return { success: true };
    },
    []
  );

  const register = useCallback(
    async (params: {
      username: string;
      email: string;
      password: string;
      name?: string;
    }): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      const baseUrl = getApiBaseUrl();
      const payload = JSON.stringify({
        username: params.username.trim(),
        email: params.email.trim(),
        password: params.password,
        name: params.name?.trim() || params.username.trim(),
      });

      const attemptFetch = async (targetUrl: string) => {
        return await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      };

      let res: Response | null = null;
      let networkError: any = null;

      try {
        res = await attemptFetch(`${baseUrl}/api/auth/register`);
      } catch (err: any) {
        networkError = err;
        console.warn(`[VoiceBook Auth] Primary register fetch to ${baseUrl}/api/auth/register failed:`, err);

        if (typeof window !== 'undefined') {
          const fallbacks = ['/api/auth/register', 'http://127.0.0.1:8000/api/auth/register'].filter(
            (fb) => fb !== `${baseUrl}/api/auth/register`
          );

          for (const fallbackUrl of fallbacks) {
            try {
              res = await attemptFetch(fallbackUrl);
              if (res) {
                networkError = null;
                break;
              }
            } catch (fallbackErr) {
              console.warn(`[VoiceBook Auth] Fallback fetch to ${fallbackUrl} failed:`, fallbackErr);
            }
          }
        }
      }

      if (!res) {
        return {
          success: false,
          error:
            networkError?.message === 'Failed to fetch'
              ? 'Unable to connect to backend server. Please verify the backend is running on port 8000.'
              : (networkError?.message || 'Unable to connect to VoiceBook registration service.'),
        };
      }

      const { data, error: parseError } = await safeParseJson(res);

      if (!res.ok) {
        return {
          success: false,
          error:
            data?.detail ||
            parseError ||
            'Registration failed. Please check your details and try again.',
        };
      }

      if (!data || !data.user) {
        return {
          success: false,
          error: 'Unexpected response received from registration service.',
        };
      }

      return { success: true, user: data.user };
    },
    []
  );

  const continueAsGuest = useCallback(async () => {
    let newGuestId = `guest-${Math.random().toString(36).substring(2, 10)}`;
    const baseUrl = getApiBaseUrl();

    try {
      let res: Response | null = null;
      try {
        res = await fetch(`${baseUrl}/api/auth/guest`, { method: 'POST' });
      } catch {
        if (typeof window !== 'undefined') {
          res = await fetch('/api/auth/guest', { method: 'POST' }).catch(() => null);
        }
      }

      if (res && res.ok) {
        const { data } = await safeParseJson(res);
        if (data?.guest_id) {
          newGuestId = data.guest_id;
        }
      }
    } catch (e) {
      console.warn('Failed to contact guest auth endpoint, using fallback guest ID:', e);
    }

    setIsGuest(true);
    setGuestId(newGuestId);
    setUser(null);
    setToken(null);

    localStorage.removeItem('voicebook_auth_token');
    localStorage.removeItem('voicebook_user');
    localStorage.setItem('voicebook_is_guest', 'true');
    localStorage.setItem('voicebook_guest_id', newGuestId);
  }, []);

  const clearSessionAndStopVoice = useCallback(() => {
    // 1. Dispatch custom event so useVoiceAgent immediately shuts down mic, WebSocket, and audio
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voicebook:logout'));
    }

    // 2. Clear state
    setUser(null);
    setToken(null);
    setIsGuest(false);
    setGuestId(null);

    // 3. Clear persistent storage
    try {
      localStorage.removeItem('voicebook_auth_token');
      localStorage.removeItem('voicebook_user');
      localStorage.removeItem('voicebook_is_guest');
      localStorage.removeItem('voicebook_guest_id');
      sessionStorage.removeItem('voicebook_is_guest');
      sessionStorage.removeItem('voicebook_guest_id');
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    const baseUrl = getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' }).catch(() => null);
    } catch {}

    clearSessionAndStopVoice();
    router.push('/login');
  }, [clearSessionAndStopVoice, router]);

  const exitGuest = useCallback(async () => {
    clearSessionAndStopVoice();
    router.push('/login');
  }, [clearSessionAndStopVoice, router]);

  const isAuthenticated = !!user && !isGuest;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isGuest,
        guestId,
        isLoading,
        isAuthenticated,
        login,
        register,
        continueAsGuest,
        logout,
        exitGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
