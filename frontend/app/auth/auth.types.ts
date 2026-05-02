/** * @file auth.types.ts
 * @description This file contains type definitions related to authentication.
 */
import type { UserResponse } from "@api";

export interface AuthContextValue {
    accessToken: string | null;
    currentUser: UserResponse | null;
    isLoadingSession: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshMe: () => Promise<void>;
    completeGoogleOAuth: (code: string) => Promise<void>;
}
