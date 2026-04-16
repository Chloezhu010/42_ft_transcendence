import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, signup as apiSignup } from '@api';
import type { UserResponse } from '@api';
import type { AuthContextValue } from './auth.types';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_STORAGE_KEY = `auth.accessToken`;

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);

    // Token helpers
    function readToken(): string | null {
        return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    }

    function saveToken(token: string): void {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        setAccessToken(token);
    }

    function clearAuthState(): void {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setAccessToken(null);
        setCurrentUser(null);
    }

    // Actions
    async function refreshMe(): Promise<void> {
        if (!accessToken) {
            setCurrentUser(null);
            return;
        }
        try {
            const user = await getMe(accessToken);
            setCurrentUser(user);
        } catch (error) {
            clearAuthState();
            throw error;
        }
    }

    async function login(email: string, password: string): Promise<void> {
        // Call the API to get the token
        const response = await apiLogin(email, password);
        const token = response.access_token;
        // Save the token
        saveToken(token);
        // Fetch the user data
        try {
            const user = await getMe(token);
            setCurrentUser(user);
        } catch (error) {
            clearAuthState();
            throw error;
        }
    }

    async function signup(email: string, username: string, password: string): Promise<void> {
        // Call the API to get the token
        const response = await apiSignup(email, username, password);
        const token = response.access_token;
        // Save the token
        saveToken(token);
        // Fetch the user data
        try {
            const user = await getMe(token);
            setCurrentUser(user);
        } catch (error) {
            clearAuthState();
            throw error;
        }
    }

    async function logout(): Promise<void> {
        // Capture the current token
        const tokenToLogout = accessToken;
        // If token exists, call the API to log out
        try {
            if (tokenToLogout) {
                await apiLogout(tokenToLogout);
            }
        } finally {
            clearAuthState();
        }
    }

    // Session restore
    useEffect(() => {
        // track if the AuthProvider component is still in the DOM
        let isMounted = true;

        async function restoreSession(): Promise<void> {
            // Read the token from localStorage
            const storedToken = readToken();
            // If no token (user not logged in), set loading to false and exit
            if (!storedToken) {
                if (isMounted) setIsLoadingSession(false);
                return;
            }
            // if token exists, set it in state and try to fetch user data
            setAccessToken(storedToken);
            try {
                const user = await getMe(storedToken);
                if (!isMounted) return;
                setCurrentUser(user);
            } catch {
                // token is invalid/ expired/ network failed, clear auth state to log out the user
                if (!isMounted) return;
                clearAuthState();
            } finally {
                if (isMounted) setIsLoadingSession(false);
            }
        }

        void restoreSession();
        
        return () => {
            isMounted = false;
        };
    }, []);

    const value: AuthContextValue = {
        accessToken,
        currentUser,
        isLoadingSession,
        login,
        signup,
        logout,
        refreshMe,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}