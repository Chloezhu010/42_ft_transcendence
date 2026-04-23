export interface FriendUser {
    id: number;
    username: string;
    avatar_url: string | null;
    is_online: boolean;
}

export type SearchUserRelationship = 'none' | 'friend' | 'pending_in' | 'pending_out';

export interface SearchUserResult extends FriendUser {
    relationship: SearchUserRelationship;
    isSending?: boolean;
}
