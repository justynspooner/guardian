export enum UserRole {
    STANDARD_REGISTRY = 'STANDARD_REGISTRY',
    USER = 'USER',
    AUDITOR = 'AUDITOR'
}

export type PolicyRole = 'NO_ROLE' | 'OWNER' | 'ANY_ROLE' | 'STANDARD_REGISTRY' | string;
