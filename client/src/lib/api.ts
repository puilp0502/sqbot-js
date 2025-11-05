import { QuizPack, QuizEntry } from "../types";

// Define API interfaces
export interface SearchResults {
  quizPacks: QuizPack[];
  total: number;
  offset: number;
  limit: number;
}

// Get API URL from environment or use default for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

// Base API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & {
    searchParams?: Record<string, string | undefined | null>;
  } = {}
): Promise<T> {
  const token = localStorage.getItem("authToken");

  const { searchParams, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (searchParams) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const paramString = params.toString();
    if (paramString) {
      url += `?${paramString}`;
    }
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  // Add Authorization header only if token exists (for Basic Auth)
  if (token) {
    headers.Authorization = token;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include", // Include cookies for session-based auth
  });

  if (response.status === 401) {
    localStorage.removeItem("authToken");
    throw new Response("Unauthorized", { status: 401 });
  }

  if (!response.ok) {
    // Create a detailed error message that can be used in the UI
    const errorMessage = `API error (${response.status}): ${response.statusText}`;
    console.error(errorMessage);

    // Throw a regular Error instead of a Response to avoid triggering the error boundary
    throw new Error(errorMessage);
  }

  return response.json();
}

// Quiz pack API functions
export function fetchQuizPack(packId: string) {
  return apiRequest<QuizPack>(`/pack/${packId}`);
}

export function updateQuizPack(packId: string, pack: QuizPack) {
  return apiRequest<void>(`/pack/${packId}`, {
    method: "PUT",
    body: JSON.stringify(pack),
  });
}

export function createQuizPack(pack: Partial<QuizPack>) {
  return apiRequest<QuizPack>(`/pack`, {
    method: "POST",
    body: JSON.stringify(pack),
  });
}

export function deleteQuizPack(packId: string) {
  return apiRequest<void>(`/pack/${packId}`, {
    method: "DELETE",
  });
}

// Search and tags API functions
export function searchQuizPacks(
  query?: string,
  tags?: string[],
  orderBy: "updatedAt" | "playCount" = "updatedAt"
) {
  return apiRequest<SearchResults>(`/search`, {
    searchParams: {
      q: query || "",
      tags: tags?.join(",") || "",
      orderBy: orderBy,
      orderDirection: "desc",
    },
  });
}

export function fetchTags() {
  return apiRequest<string[]>(`/tags`);
}

// Authentication functions
export function checkAuthStatus() {
  const token = localStorage.getItem("authToken");
  return !!token;
}

export async function logout() {
  try {
    // Try to logout from session-based auth
    const AUTH_API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001") + "/auth";
    await fetch(`${AUTH_API_BASE}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error logging out:", error);
  }
  // Always clear local storage
  localStorage.removeItem("authToken");
}

// Helper function for auth protection
export function requireAuth() {
  if (!checkAuthStatus()) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

// User info functions
export interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const AUTH_API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001") + "/auth";
    const response = await fetch(`${AUTH_API_BASE}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
