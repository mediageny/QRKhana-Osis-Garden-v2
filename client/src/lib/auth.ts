import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export async function login(credentials: LoginRequest): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/login", credentials);
  return await response.json();
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest("GET", "/api/auth/me");
    return await response.json();
  } catch (error) {
    return null;
  }
}
