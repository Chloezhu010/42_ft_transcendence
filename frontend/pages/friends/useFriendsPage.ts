/**
 * Friends page controller.
 * Owns the state of the friends list, incoming friend requests, and the
 * handlers to accept/decline requests and remove friends.
 */

import { UserResponse } from "@/client-api/userApi";

interface UseFriendsPageResult {
    friends: UserResponse[];
    pending: UserResponse[];
    searchResults: UserResponse[];
    isLoading: boolean;
}

export function useFriendsPage(): UseFriendsPageResult {
    return {
        friends: [],
        pending: [],
        searchResults: [],
        isLoading: false,
    }
}