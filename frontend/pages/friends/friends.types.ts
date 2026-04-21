import { PublicUserResponse } from "@api";

export type SearchUserRelationship = 'none' | 'friend' | 'pending';

export interface SearchUserResult extends PublicUserResponse {
    relationship: SearchUserRelationship;
    isIncomingRequest?: boolean; 
}