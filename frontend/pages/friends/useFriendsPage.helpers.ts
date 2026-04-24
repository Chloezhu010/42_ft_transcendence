import type { FriendResponse, PublicUserResponse } from '@api';
import type { SearchUserResult } from '@/components/friends/friends.types';

export function createIdSet(users: Array<{ id: number }>): Set<number> {
  return new Set(users.map((user) => user.id));
}

export function addIdToSet(ids: Set<number>, id: number): Set<number> {
  return new Set(ids).add(id);
}

export function removeIdFromSet(ids: Set<number>, id: number): Set<number> {
  const nextIds = new Set(ids);
  nextIds.delete(id);
  return nextIds;
}

export function removeFriendById(friends: FriendResponse[], id: number): FriendResponse[] {
  return friends.filter((friend) => friend.id !== id);
}

export function replaceFriendById(
  friends: FriendResponse[],
  id: number,
  nextFriend: FriendResponse,
): FriendResponse[] {
  return friends.map((friend) => (friend.id === id ? nextFriend : friend));
}

interface DecorateSearchResultsParams {
  searchResults: PublicUserResponse[];
  friendIds: Set<number>;
  pendingIncomingIds: Set<number>;
  pendingOutgoingIds: Set<number>;
  sendingIds: Set<number>;
}

export function decorateSearchResults({
  searchResults,
  friendIds,
  pendingIncomingIds,
  pendingOutgoingIds,
  sendingIds,
}: DecorateSearchResultsParams): SearchUserResult[] {
  return searchResults.map((user) => ({
    ...user,
    relationship: getSearchResultRelationship(
      user.id,
      friendIds,
      pendingIncomingIds,
      pendingOutgoingIds,
    ),
    isSending: sendingIds.has(user.id),
  }));
}

function getSearchResultRelationship(
  userId: number,
  friendIds: Set<number>,
  pendingIncomingIds: Set<number>,
  pendingOutgoingIds: Set<number>,
): SearchUserResult['relationship'] {
  if (friendIds.has(userId)) {
    return 'friend';
  }

  if (pendingIncomingIds.has(userId)) {
    return 'pending_in';
  }

  if (pendingOutgoingIds.has(userId)) {
    return 'pending_out';
  }

  return 'none';
}

export function createOutgoingRequest(user: PublicUserResponse): FriendResponse {
  return {
    ...user,
    friendship_status: 'pending',
    is_requester: true,
  };
}

export function createAcceptedFriend(friend: FriendResponse): FriendResponse {
  return {
    ...friend,
    friendship_status: 'accepted',
  };
}

function isConflictError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'status' in error
    && error.status === 409;
}

export function getSendRequestErrorMessage(error: unknown): string {
  if (isConflictError(error)) {
    return 'Friend request already exists.';
  }

  return 'Could not send friend request.';
}
