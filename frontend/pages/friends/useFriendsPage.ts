/**
 * Friends page controller.
 * Owns the state of the friends list, incoming friend requests, and the
 * handlers to accept/decline requests and remove friends.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/app/auth";
import { getFriends, getPendingFriendRequests, sendFriendRequest, FriendResponse, PublicUserResponse, searchUsers } from "@api";
import { SearchUserResult } from "./friends.types";

// ----------------------------------------------------
// Mock toggle and data for testing UI without backend
// ----------------------------------------------------
const USE_MOCK_DATA = false; // Toggle to true to test with mock data in useFriendsPage
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
    { id: 101, username: "Alice",   avatar_url: null, is_online: true,  created_at: "2026-04-21T00:00:00Z" }, // friend
    { id: 102, username: "Bob",     avatar_url: null, is_online: false, created_at: "2026-04-21T00:00:00Z" }, // friend
    { id: 201, username: "Charlie", avatar_url: null, is_online: true,  created_at: "2026-04-21T00:00:00Z" }, // pending
    { id: 301, username: "Dana",    avatar_url: null, is_online: true,  created_at: "2026-04-21T00:00:00Z" }, // stranger
    { id: 302, username: "Eli",     avatar_url: null, is_online: false, created_at: "2026-04-21T00:00:00Z" }, // stranger
    { id: 303, username: "Fatima",  avatar_url: null, is_online: true,  created_at: "2026-04-21T00:00:00Z" }, // stranger
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
    pendingIncoming: FriendResponse[];
    searchResults: SearchUserResult[];
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    sendRequest: (userId: number) => void;
    sendingIds: Set<number>;
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
    const [pendingIncoming, setPendingIncoming] = useState<FriendResponse[]>(USE_MOCK_DATA ? MOCK_PENDING : []);
    const [pendingOutgoing, setPendingOutgoing] = useState<FriendResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserResponse[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Memoized sets for quick lookup of friend and pending IDs
    const friendsIds = useMemo(() => new Set(friends.map(f => f.id)), [friends]);
    const pendingIncomingIds = useMemo(() => new Set(pendingIncoming.map(p => p.id)), [pendingIncoming]);
    const pendingOutgoingIds = useMemo(() => new Set(pendingOutgoing.map(p => p.id)), [pendingOutgoing]);
    
    const decoratedResults = useMemo<SearchUserResult[]>(() => searchResults.map(u => ({
        ...u,
        relationship: friendsIds.has(u.id) ? 'friend'
                    : pendingIncomingIds.has(u.id) ? 'pending_in'
                    : pendingOutgoingIds.has(u.id) ? 'pending_out'
                    : 'none',
        isSending: sendingIds.has(u.id),
    })),
    [searchResults, friendsIds, pendingIncomingIds, pendingOutgoingIds, sendingIds]);

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
                setPendingIncoming(pendingData);
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

    const sendRequest = useCallback(async (userId: number) => {
        const target = searchResults.find(u => u.id === userId);
        if (!target) return;

        // mark inflight
        setSendingIds(prev => new Set(prev).add(userId));
        // snapshot, optimistic insert into pending
        const optimistic: FriendResponse = {
            ...target,
            friendship_status: 'pending',
            is_requester: true,
        };
        setPendingOutgoing(prev => [...prev, optimistic]);

        try {
            if (USE_MOCK_DATA) return;

            if (!accessToken) throw new Error('No session');
            const confirmed = await sendFriendRequest(accessToken, userId);
            setPendingOutgoing(prev => prev.map(p => p.id === userId ? confirmed : p));
        } catch (err) {
            // rollback on failure
            setPendingOutgoing(prev => prev.filter(p => p.id !== userId));
            setError('Could not send friend request.');
        } finally {
            // clear inflight flag
            setSendingIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    }, [accessToken, searchResults]);

    // Mock override for testing UI without backend
    if (USE_MOCK_DATA) {
        return {
            friends: MOCK_FRIENDS,
            pendingIncoming: MOCK_PENDING,
            searchResults: decoratedResults,
            searchQuery: searchQuery,
            setSearchQuery: setSearchQuery,
            sendRequest: () => {},
            sendingIds: new Set(),
            isSearching: false,
            isLoading: false,
            error: null,
        };
    }

    return {
        friends: friends,
        pendingIncoming: pendingIncoming,
        searchResults: decoratedResults,
        searchQuery: searchQuery,
        setSearchQuery: setSearchQuery,
        sendRequest: sendRequest,
        sendingIds: sendingIds,
        isLoading: isLoading,
        isSearching: isSearching,
        error: error,
    }
}
