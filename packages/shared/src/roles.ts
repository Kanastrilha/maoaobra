export const ROLES = ['customer', 'pro', 'admin'] as const;
export type Role = (typeof ROLES)[number];
