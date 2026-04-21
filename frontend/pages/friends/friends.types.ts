import { PublicUserResponse } from "@api";

export type SearchUserRelationship = 'none' | 'friend' | 'pending_in' | 'pending_out';

export interface SearchUserResult extends PublicUserResponse {
    relationship: SearchUserRelationship;
    isSending?: boolean;
}
