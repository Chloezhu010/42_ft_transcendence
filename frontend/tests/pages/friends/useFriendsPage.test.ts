/**
 * Unit tests for useFriendsPage hook.
 *
 * Strategy: renderHook (no DOM) + all @api calls mocked.
 * Why unit (not integration via FriendsPage RTL)?
 *   - We can assert internal state like pendingActionIds directly.
 *   - Error paths are trivial to force — just make the mock reject.
 *   - No need to fight the debounce or wait for DOM elements.
 *
 * Pattern under test — optimistic update + rollback:
 *   optimistic mutation → API call → (success) reconcile with server row
 *                                  → (failure) rollback + setError
 */
import '@testing-library/jest-dom/vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FriendResponse } from '@api';
import { useFriendsPage } from '@/pages/friends/useFriendsPage';

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted runs before imports, so the vi.mock() factories
// below can safely reference these variables. Without hoisting, the factory
// closure would capture `undefined` at the time vi.mock() runs.
// ---------------------------------------------------------------------------
const {
    mockUseAuth,
    mockGetFriends,
    mockGetPending,
    mockGetOutgoing,
    mockAcceptFriendRequest,
    mockRemoveFriend,
    mockSearchUsers,
} = vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockGetFriends: vi.fn(),
    mockGetPending: vi.fn(),
    mockGetOutgoing: vi.fn(),
    mockAcceptFriendRequest: vi.fn(),
    mockRemoveFriend: vi.fn(),
    mockSearchUsers: vi.fn(),
}));

// Mock the auth hook — keeps tests independent of auth state.
vi.mock('@/app/auth', () => ({
    useAuth: mockUseAuth,
}));

// Mock the entire @api barrel.
// The hook imports from '@api', not from the individual friendApi.ts file,
// so we mock the barrel (not './friendApi') to intercept the correct module.
vi.mock('@api', () => ({
    getFriends: mockGetFriends,
    getPendingFriendRequests: mockGetPending,
    getOutgoingFriendRequests: mockGetOutgoing,
    acceptFriendRequest: mockAcceptFriendRequest,
    // removeFriend is intentionally shared: both declineRequest and removeFriend
    // call DELETE /friends/:id (removeFriendApi), which maps to this mock.
    removeFriend: mockRemoveFriend,
    // These are used by other parts of the hook; stub them as no-ops so they
    // don't throw on the initial render / search effects.
    searchUsers: mockSearchUsers,
    sendFriendRequest: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// alice  — an INCOMING pending request (is_requester: false means SHE sent it to us)
// bob    — an ACCEPTED friend
// Both are reused across tests; each test sets up mock return values using them.
// ---------------------------------------------------------------------------
const alice: FriendResponse = {
    id: 1,
    username: 'alice',
    avatar_url: null,
    is_online: true,
    friendship_status: 'pending',
    is_requester: false, // alice sent the request to us
};

const bob: FriendResponse = {
    id: 2,
    username: 'bob',
    avatar_url: null,
    is_online: false,
    friendship_status: 'accepted',
    is_requester: true,
};

const cara: FriendResponse = {
    id: 3,
    username: 'cara',
    avatar_url: null,
    is_online: true,
    friendship_status: 'pending',
    is_requester: true,
};

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

// ---------------------------------------------------------------------------
// Setup helper
// Renders the hook and waits for the initial data fetch to finish.
// Why await isLoading === false?  The hook fires an async effect on mount.
// Without waiting, assertions run before getFriends / getPending resolve,
// so friends/pendingIncoming would still be empty arrays.
// ---------------------------------------------------------------------------
async function setup() {
    const { result } = renderHook(() => useFriendsPage());
    await waitFor(() => {
        expect(result.current.friends).toContainEqual(bob);
        expect(result.current.pendingIncoming).toContainEqual(alice);
    });
    return result;
}

// ---------------------------------------------------------------------------
// Default mock wiring — reset before every test so each test is independent.
// Tests that need different return values override these in their own arrange step.
// ---------------------------------------------------------------------------
beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({ accessToken: 'test-token' });

    // Default initial state: one accepted friend (bob), one incoming request (alice).
    mockGetFriends.mockResolvedValue([bob]);
    mockGetPending.mockResolvedValue([alice]);
    mockGetOutgoing.mockResolvedValue([]);
    mockSearchUsers.mockResolvedValue([]);
});

describe('initial load', () => {
    it('hydrates outgoing pending requests into search result relationships', async () => {
        mockGetOutgoing.mockResolvedValue([cara]);
        mockSearchUsers.mockResolvedValue([
            {
                id: cara.id,
                username: cara.username,
                avatar_url: cara.avatar_url,
                is_online: cara.is_online,
                created_at: '2026-04-22T00:00:00Z',
            },
        ]);

        const { result } = renderHook(() => useFriendsPage());

        await waitFor(() => {
            expect(result.current.friends).toContainEqual(bob);
            expect(result.current.pendingIncoming).toContainEqual(alice);
        });

        await act(async () => {
            result.current.setSearchQuery('cara');
        });

        await waitFor(() => {
            expect(result.current.searchResults).toContainEqual(
                expect.objectContaining({
                    id: cara.id,
                    relationship: 'pending_out',
                    isSending: false,
                })
            );
        });
    });
});

// ===========================================================================
// acceptRequest
// ===========================================================================
describe('acceptRequest', () => {
    it('moves the row from pendingIncoming to friends on success', async () => {
        // Arrange: server returns alice upgraded to accepted status.
        // The hook should replace its optimistic row with this server response.
        const aliceAccepted: FriendResponse = {
            ...alice,
            friendship_status: 'accepted',
        };
        mockAcceptFriendRequest.mockResolvedValue(aliceAccepted);

        const result = await setup();
        // Act: call the handler and wait for all state updates to settle.
        await act(async () => {
            await result.current.acceptRequest(alice.id);
        });
        // assert alice moved out of pending and into friends
        expect(result.current.pendingIncoming.some(r => r.id === alice.id)).toBe(false);
        expect(result.current.friends).toContainEqual(aliceAccepted);
        // assert API called with correct args
        expect(mockAcceptFriendRequest).toHaveBeenCalledWith('test-token', alice.id);
    });

    it('rolls back pendingIncoming and sets error when API fails', async () => {
        // Arrange: server rejects (e.g. network error or 409 conflict).
        mockAcceptFriendRequest.mockRejectedValue(new Error('server error'));

        const result = await setup();
        await act(async () => {
            await result.current.acceptRequest(alice.id);
        });
        expect(result.current.pendingIncoming.some(r => r.id === alice.id)).toBe(true);
        expect(result.current.friends.some(f => f.id === alice.id)).toBe(false);
        expect(result.current.actionError).toBeTruthy();
    });

    it('is a no-op when userId is not in pendingIncoming', async () => {
        // Guard test: calling with an id that doesn't exist in pendingIncoming
        // must not reach the network (mirrors the sendRequest guard on line 175
        // of useFriendsPage.ts — "if (!target) return").
        // Explicit setup: if the guard were to fail and the API were called,
        // it would resolve cleanly (not throw), making the bug harder to spot
        // without the toHaveBeenCalledTimes(0) assertion below.
        mockAcceptFriendRequest.mockResolvedValue(undefined);

        const result = await setup();

        await act(async () => {
            await result.current.acceptRequest(999);
        });
        expect(mockAcceptFriendRequest).toHaveBeenCalledTimes(0);
        expect(result.current.pendingIncoming.some(r => r.id === alice.id)).toBe(true);
        expect(result.current.friends.some(f => f.id === bob.id)).toBe(true);
    });

    it('tracks pendingActionIds while the accept request is in flight', async () => {
        const deferred = createDeferred<FriendResponse>();
        mockAcceptFriendRequest.mockReturnValue(deferred.promise);

        const result = await setup();

        // Fire-and-forget: intentionally not awaited so we can assert the
        // inflight state before the deferred promise resolves.
        act(() => {
            void result.current.acceptRequest(alice.id);
        });

        await waitFor(() => {
            expect(result.current.pendingActionIds.has(alice.id)).toBe(true);
        });

        await act(async () => {
            deferred.resolve({
                ...alice,
                friendship_status: 'accepted',
            });
            await deferred.promise;
        });

        await waitFor(() => {
            expect(result.current.pendingActionIds.has(alice.id)).toBe(false);
        });
    });
});

// ===========================================================================
// declineRequest
// ===========================================================================
describe('declineRequest', () => {
    it('removes the row from pendingIncoming on success', async () => {
        // Arrange: DELETE returns void — there is no server row to reconcile,
        // the optimistic removal is the final state.
        mockRemoveFriend.mockResolvedValue(undefined);

        const result = await setup();

        await act(async () => {
            await result.current.declineRequest(alice.id);
        });

        expect(result.current.pendingIncoming.some(r => r.id === alice.id)).toBe(false);
        expect(result.current.friends).toHaveLength(1);
        expect(result.current.friends.some(f => f.id === bob.id)).toBe(true);
        expect(mockRemoveFriend).toHaveBeenCalledWith('test-token', alice.id);
    });

    it('rolls back pendingIncoming and sets error when API fails', async () => {
        // Arrange: DELETE rejects — the optimistic removal must be undone.
        mockRemoveFriend.mockRejectedValue(new Error('server error'));

        const result = await setup();

        await act(async () => {
            await result.current.declineRequest(alice.id);
        });

        expect(result.current.pendingIncoming.some(r => r.id === alice.id)).toBe(true);
        expect(result.current.actionError).toBeTruthy();
    });

    it('is a no-op when userId is not in pendingIncoming', async () => {
        // Explicit setup: without a return value, a guard failure would call
        // the mock with undefined return, await undefined, and silently pass
        // — making toHaveBeenCalledTimes(0) the only line catching the bug.
        mockRemoveFriend.mockResolvedValue(undefined);

        const result = await setup();

        await act(async () => {
            await result.current.declineRequest(999);
        });

        expect(mockRemoveFriend).toHaveBeenCalledTimes(0);
        expect(result.current.pendingIncoming).toContainEqual(alice);
        expect(result.current.friends).toContainEqual(bob);
    });

    it('tracks pendingActionIds while the decline request is in flight', async () => {
        const deferred = createDeferred<void>();
        mockRemoveFriend.mockReturnValue(deferred.promise);

        const result = await setup();

        // Fire-and-forget: intentionally not awaited so we can assert the
        // inflight state before the deferred promise resolves.
        act(() => {
            void result.current.declineRequest(alice.id);
        });

        await waitFor(() => {
            expect(result.current.pendingActionIds.has(alice.id)).toBe(true);
        });

        await act(async () => {
            deferred.resolve(undefined);
            await deferred.promise;
        });

        await waitFor(() => {
            expect(result.current.pendingActionIds.has(alice.id)).toBe(false);
        });
    });
});

// ===========================================================================
// removeFriend
// ===========================================================================
describe('removeFriend', () => {
    it('removes the row from friends on success', async () => {
        // Arrange: DELETE returns void.
        mockRemoveFriend.mockResolvedValue(undefined);

        const result = await setup();

        await act(async () => {
            await result.current.removeFriend(bob.id);
        });

        expect(result.current.friends.some(f => f.id === bob.id)).toBe(false);
        expect(result.current.pendingIncoming).toHaveLength(1);
        expect(result.current.pendingIncoming.some(r => r.id === alice.id)).toBe(true);
        expect(mockRemoveFriend).toHaveBeenCalledWith('test-token', bob.id);
    });

    it('rolls back friends and sets error when API fails', async () => {
        // Arrange: DELETE rejects — the optimistic removal must be undone.
        mockRemoveFriend.mockRejectedValue(new Error('server error'));

        const result = await setup();

        await act(async () => {
            await result.current.removeFriend(bob.id);
        });

        expect(result.current.friends.some(f => f.id === bob.id)).toBe(true);
        expect(result.current.actionError).toBeTruthy();
    });

    it('is a no-op when friendId is not in friends', async () => {
        // Explicit setup: same reasoning as the declineRequest guard test above.
        mockRemoveFriend.mockResolvedValue(undefined);

        const result = await setup();

        await act(async () => {
            await result.current.removeFriend(999);
        });

        expect(mockRemoveFriend).toHaveBeenCalledTimes(0);
        expect(result.current.friends).toContainEqual(bob);
        expect(result.current.pendingIncoming).toContainEqual(alice);
    });

    it('tracks pendingActionIds while removeFriend is in flight', async () => {
        const deferred = createDeferred<void>();
        mockRemoveFriend.mockReturnValue(deferred.promise);

        const result = await setup();

        // Fire-and-forget: intentionally not awaited so we can assert the
        // inflight state before the deferred promise resolves.
        act(() => {
            void result.current.removeFriend(bob.id);
        });

        await waitFor(() => {
            expect(result.current.pendingActionIds.has(bob.id)).toBe(true);
        });

        await act(async () => {
            deferred.resolve(undefined);
            await deferred.promise;
        });

        await waitFor(() => {
            expect(result.current.pendingActionIds.has(bob.id)).toBe(false);
        });
    });
});
