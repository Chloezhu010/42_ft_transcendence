/**
 * Friends page controller.
 * Owns the state of the friends list, incoming friend requests, and the
 * handlers to accept/decline requests and remove friends.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth";
import { getFriends, getPendingFriendRequests, FriendResponse, PublicUserResponse, searchUsers } from "@api";
import { SearchUserResult } from "./friends.types";

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

// Pool of users returned by mock search.
const MOCK_DISCOVERABLE_USERS: PublicUserResponse[] = [
    { id: 101, username: "Alice",   avatar_url: null, is_online: true  }, // friend
    { id: 102, username: "Bob",     avatar_url: null, is_online: false }, // friend
    { id: 201, username: "Charlie", avatar_url: null, is_online: true  }, // pending
    { id: 301, username: "Dana",    avatar_url: null, is_online: true  }, // stranger
    { id: 302, username: "Eli",     avatar_url: null, is_online: false }, // stranger
    { id: 303, username: "Fatima",  avatar_url: null, is_online: true  }, // stranger
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
    searchResults: SearchUserResult[];
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
    const [friends, setFriends] = useState<FriendResponse[]>(USE_MOCK_DATA ? MOCK_FRIENDS : []);
    const [pending, setPending] = useState<FriendResponse[]>(USE_MOCK_DATA ? MOCK_PENDING : []);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserResponse[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Memoized sets for quick lookup of friend and pending IDs
    const friendsIds = useMemo(() => new Set(friends.map(f => f.id)), [friends]);
    const pendingIds = useMemo(() => new Set(pending.map(p => p.id)), [pending]);
    
    const decoratedResults = useMemo<SearchUserResult[]>(() => searchResults.map(u => ({
        ...u,
        relationship: friendsIds.has(u.id) ? 'friend' : pendingIds.has(u.id) ? 'pending' : 'none',
        isIncomingRequest: pending.find(p => p.id === u.id)?.is_requester === false,
    })),
    [searchResults, friendsIds, pendingIds, pending]);

    // Initial load effect: fetch friends and pending requests
    useEffect(() => {
        if (USE_MOCK_DATA) return; // keep the seeded mock state, skip network
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
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        // Mock mode: filter the discoverable pool locally, no network call.
        if (USE_MOCK_DATA) {
            const needle = trimmed.toLowerCase();
            setSearchResults(
                MOCK_DISCOVERABLE_USERS.filter(u =>
                    u.username.toLowerCase().includes(needle)
                )
            );
            setIsSearching(false);
            return;
        }

        if (!accessToken) {
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
            searchResults: decoratedResults,
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
        searchResults: decoratedResults,
        searchQuery: searchQuery,
        setSearchQuery: setSearchQuery,
        isLoading: isLoading,
        isSearching: isSearching,
        error: error,
    }
}