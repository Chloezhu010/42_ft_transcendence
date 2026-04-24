/**
 * Friends page controller.
 * Owns the state of the friends list, incoming friend requests, and the
 * handlers to accept/decline requests and remove friends.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/app/auth";
import type { FriendResponse, PublicUserResponse } from "@api";
import {
    getFriends,
    getPendingFriendRequests,
    getOutgoingFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend as removeFriendApi,
    searchUsers,
} from "@api";
import type { SearchUserResult } from "@/components/friends/friends.types";
import {
    MOCK_DISCOVERABLE_USERS,
    MOCK_FRIENDS,
    MOCK_PENDING_FRIENDS,
    USE_FRIENDS_MOCK_DATA,
} from './friends.fixtures';
import {
    addIdToSet,
    createAcceptedFriend,
    createIdSet,
    createOutgoingRequest,
    decorateSearchResults,
    getSendRequestErrorMessage,
    removeFriendById,
    removeIdFromSet,
    replaceFriendById,
} from './useFriendsPage.helpers';

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
    // Accepts an incoming pending request from userId.
    // Moves the row from pendingIncoming → friends on success; rolls back on error.
    acceptRequest: (userId: number) => void;
    // Declines (removes) an incoming pending request from userId.
    // Drops the row from pendingIncoming on success; rolls back on error.
    declineRequest: (userId: number) => void;
    // Removes an accepted friend by friendId.
    // Drops the row from friends on success; rolls back on error.
    removeFriend: (friendId: number) => void;
    sendingIds: Set<number>;
    // Tracks ids for which acceptRequest / declineRequest / removeFriend is inflight.
    pendingActionIds: Set<number>;
    isLoading: boolean;
    isSearching: boolean;
    loadError: string | null;
    actionError: string | null;
    clearActionError: () => void;
}

// ----------------------------------------------------
// Hook
// ----------------------------------------------------
export function useFriendsPage(): UseFriendsPageResult {
    const { accessToken } = useAuth();
    const [friends, setFriends] = useState<FriendResponse[]>(USE_FRIENDS_MOCK_DATA ? MOCK_FRIENDS : []);
    const [pendingIncoming, setPendingIncoming] = useState<FriendResponse[]>(USE_FRIENDS_MOCK_DATA ? MOCK_PENDING_FRIENDS : []);
    const [pendingOutgoing, setPendingOutgoing] = useState<FriendResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserResponse[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());
    // Separate inflight set for accept / decline / remove so sendingIds stays
    // scoped to outgoing send-request actions only.
    const [pendingActionIds, setPendingActionIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const friendsIds = useMemo(() => createIdSet(friends), [friends]);
    const pendingIncomingIds = useMemo(() => createIdSet(pendingIncoming), [pendingIncoming]);
    const pendingOutgoingIds = useMemo(() => createIdSet(pendingOutgoing), [pendingOutgoing]);
    
    const decoratedResults = useMemo(
        () => decorateSearchResults({
            searchResults,
            friendIds: friendsIds,
            pendingIncomingIds,
            pendingOutgoingIds,
            sendingIds,
        }),
        [searchResults, friendsIds, pendingIncomingIds, pendingOutgoingIds, sendingIds],
    );

    // Initial load effect: fetch friends and pending requests
    useEffect(() => {
        if (USE_FRIENDS_MOCK_DATA) return; // keep the seeded mock state, skip network
        if (!accessToken) return;
        const fetchFriendsData = async () => {
            setIsLoading(true);
            setLoadError(null);

            try {
                const [friendsData, pendingIncomingData, pendingOutgoingData] = await Promise.all([
                    getFriends(accessToken),
                    getPendingFriendRequests(accessToken),
                    getOutgoingFriendRequests(accessToken),
                ]);

                setFriends(friendsData);
                setPendingIncoming(pendingIncomingData);
                setPendingOutgoing(pendingOutgoingData);
            } catch {
                setLoadError("Failed to fetch friends data.");
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
        if (USE_FRIENDS_MOCK_DATA) {
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
        if (sendingIds.has(userId)) return;
        if (pendingOutgoingIds.has(userId)) return;
        if (friendsIds.has(userId)) return;
        if (pendingIncomingIds.has(userId)) return;

        setActionError(null);

        // mark inflight
        setSendingIds(prev => addIdToSet(prev, userId));
        const optimistic = createOutgoingRequest(target);
        setPendingOutgoing(prev => [...prev, optimistic]);

        try {
            if (USE_FRIENDS_MOCK_DATA) return;

            if (!accessToken) throw new Error('No session');
            const confirmed = await sendFriendRequest(accessToken, userId);
            setPendingOutgoing(prev => replaceFriendById(prev, userId, confirmed));
        } catch (err) {
            setPendingOutgoing(prev => removeFriendById(prev, userId));
            setActionError(getSendRequestErrorMessage(err));
        } finally {
            setSendingIds(prev => removeIdFromSet(prev, userId));
        }
    }, [accessToken, friendsIds, pendingIncomingIds, pendingOutgoingIds, searchResults, sendingIds]);

    // Accept an incoming pending friend request from `userId`
    const acceptRequest = useCallback(async (userId: number) => {
        // find the target row in pendingIncoming
        const target = pendingIncoming.find(r => r.id === userId);
        if (!target) return;
        setActionError(null);
        setPendingActionIds(prev => addIdToSet(prev, userId));
        const optimistic = createAcceptedFriend(target);
        setPendingIncoming(prev => removeFriendById(prev, userId));
        setFriends(prev => [...prev, optimistic]);
        try {
            if (!USE_FRIENDS_MOCK_DATA) {
                if (!accessToken) throw new Error('No session');
                const confirmed = await acceptFriendRequest(accessToken, userId);
                setFriends(prev => replaceFriendById(prev, userId, confirmed));
            }
        } catch {
            setFriends(prev => removeFriendById(prev, userId));
            setPendingIncoming(prev => [...prev, target]);
            setActionError('Could not accept friend request.');
        } finally {
            setPendingActionIds(prev => removeIdFromSet(prev, userId));
        }
    }, [accessToken, pendingIncoming]);

    // Decline (reject) an incoming pending friend request from `userId`
    const declineRequest = useCallback(async (userId: number) => {
        // find the target row in pendingIncoming
        const target = pendingIncoming.find(r => r.id === userId);
        if (!target) return;
        setActionError(null);
        setPendingActionIds(prev => addIdToSet(prev, userId));
        setPendingIncoming(prev => removeFriendById(prev, userId));
        try {
            if (!USE_FRIENDS_MOCK_DATA) {
                if (!accessToken) throw new Error('No session');
                await removeFriendApi(accessToken, userId);
            }
        } catch {
            setPendingIncoming(prev => [...prev, target]);
            setActionError('Could not decline friend request.');
        } finally {
            setPendingActionIds(prev => removeIdFromSet(prev, userId));
        }
    }, [accessToken, pendingIncoming]);

    // Remove an accepted friend by `friendId`
    const removeFriend = useCallback(async (friendId: number) => {
        // find the target row in friends
        const target = friends.find(f => f.id === friendId);
        if (!target) return;
        setActionError(null);
        setPendingActionIds(prev => addIdToSet(prev, friendId));
        setFriends(prev => removeFriendById(prev, friendId));
        try {
            if (!USE_FRIENDS_MOCK_DATA) {
                if (!accessToken) throw new Error('No session');
                await removeFriendApi(accessToken, friendId);
            }
        } catch {
            setFriends(prev => [...prev, target]);
            setActionError('Could not remove friend.');
        } finally {
            setPendingActionIds(prev => removeIdFromSet(prev, friendId));
        }
    }, [accessToken, friends]);

    const clearActionError = useCallback((): void => {
        setActionError(null);
    }, []);

    // Mock override for testing UI without backend
    if (USE_FRIENDS_MOCK_DATA) {
        return {
            friends: MOCK_FRIENDS,
            pendingIncoming: MOCK_PENDING_FRIENDS,
            searchResults: decoratedResults,
            searchQuery: searchQuery,
            setSearchQuery: setSearchQuery,
            sendRequest: () => {},
            acceptRequest: () => {},
            declineRequest: () => {},
            removeFriend: () => {},
            sendingIds: new Set(),
            pendingActionIds: new Set(),
            isSearching: false,
            isLoading: false,
            loadError: null,
            actionError: null,
            clearActionError: () => {},
        };
    }

    return {
        friends: friends,
        pendingIncoming: pendingIncoming,
        searchResults: decoratedResults,
        searchQuery: searchQuery,
        setSearchQuery: setSearchQuery,
        sendRequest: sendRequest,
        acceptRequest: acceptRequest,
        declineRequest: declineRequest,
        removeFriend: removeFriend,
        sendingIds: sendingIds,
        pendingActionIds: pendingActionIds,
        isLoading: isLoading,
        isSearching: isSearching,
        loadError: loadError,
        actionError: actionError,
        clearActionError: clearActionError,
    }
}
