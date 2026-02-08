/**
 * User-related type definitions
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  clerkId: string;
  email: string;
  name?: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface UserResponseDto extends User {
  // Add any computed fields here
}
