/**
 * Friends page controller.
 * Owns the state of the friends list, incoming friend requests, and the
 * handlers to accept/decline requests and remove friends.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth";
import { getFriends, getPendingFriendRequests, FriendResponse, PublicUserResponse, searchUsers } from "@api";

// ----------------------------------------------------
// Mock toggle and data for testing UI without backend
// ----------------------------------------------------
const USE_MOCK_DATA = true; // Toggle to true to test with mock data in useFriendsPage
const MOCK_FRIENDS: FriendResponse[] = [
    {
        id: 101,
        username: "Alice",
        avatar_url: null,
        is_online: true,
        friendship_status: "accepted",
        is_requester: false,
    },
    {
        id: 102,
        username: "Bob",
        avatar_url: null,
        is_online: false,
        friendship_status: "accepted",
        is_requester: true,
    }
]
const MOCK_PENDING: FriendResponse[] = [
    {
        id: 201,
        username: "Charlie",
        avatar_url: null,
        is_online: true,
        friendship_status: "pending",
        is_requester: false,
    },
]

// ----------------------------------------------------
// Constants
// ----------------------------------------------------
const SEARCH_DEBOUNCE_MS = 300;

// ----------------------------------------------------
// Return type
// ----------------------------------------------------
interface UseFriendsPageResult {
    friends: FriendResponse[];
    pending: FriendResponse[];
    searchResults: PublicUserResponse[];
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    isLoading: boolean;
    isSearching: boolean;
    error: string | null;
}

// ----------------------------------------------------
// Hook
// ----------------------------------------------------
export function useFriendsPage(): UseFriendsPageResult {
    const { accessToken } = useAuth();
    const [friends, setFriends] = useState<FriendResponse[]>([]);
    const [pending, setPending] = useState<FriendResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserResponse[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Initial load effect: fetch friends and pending requests
    useEffect(() => {
        if (!accessToken) return;
        const fetchFriendsData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const [friendsData, pendingData] = await Promise.all([
                    getFriends(accessToken),
                    getPendingFriendRequests(accessToken)
                ]);

                setFriends(friendsData);
                setPending(pendingData);
            } catch (err) {
                setError("Failed to fetch friends data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFriendsData();
    }, [accessToken]);

    // Debounced search effect: fetch search results when query changes
    useEffect(() => {
        if (!accessToken) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        const handle = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchUsers(accessToken, trimmed);
                setSearchResults(results);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(handle);
    }, [searchQuery, accessToken]);


    // Mock override for testing UI without backend
    if (USE_MOCK_DATA) {
        return {
            friends: MOCK_FRIENDS,
            pending: MOCK_PENDING,
            searchResults: searchResults,
            searchQuery: searchQuery,
            setSearchQuery: setSearchQuery,
            isSearching: false,
            isLoading: false,
            error: null,
        };
    }

    return {
        friends: friends,
        pending: pending,
        searchResults: searchResults,
        searchQuery: searchQuery,
        setSearchQuery: setSearchQuery,
        isLoading: isLoading,
        isSearching: isSearching,
        error: error,
    }
}