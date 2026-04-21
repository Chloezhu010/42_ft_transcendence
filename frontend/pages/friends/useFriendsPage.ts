/**
 * Friends page controller.
 * Owns the state of the friends list, incoming friend requests, and the
 * handlers to accept/decline requests and remove friends.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth";
import { getFriends, getPendingFriendRequests, FriendResponse, PublicUserResponse } from "@api";
interface UseFriendsPageResult {
    friends: FriendResponse[];
    pending: FriendResponse[];
    searchResults: PublicUserResponse[];
    isLoading: boolean;
    error: string | null;
}

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

export function useFriendsPage(): UseFriendsPageResult {
    if (USE_MOCK_DATA) {
        return {
            friends: MOCK_FRIENDS,
            pending: MOCK_PENDING,
            searchResults: [],
            isLoading: false,
            error: null,
        };
    }

    const { accessToken } = useAuth();
    const [friends, setFriends] = useState<FriendResponse[]>([]);
    const [pending, setPending] = useState<FriendResponse[]>([]);
    const [searchResults, setSearchResults] = useState<PublicUserResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

    return {
        friends: friends,
        pending: pending,
        searchResults: searchResults,
        isLoading: isLoading,
        error: error,
    }
}