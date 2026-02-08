/**
 * API client for backend communication
 * Handles authentication, error handling, and response parsing
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

/**
 * Wrapper for fetch with authentication and error handling
 */
async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Dashboard API
 */
export const dashboardApi = {
  /**
   * Get user dashboard stats
   */
  async getStats() {
    return fetchApi('/users/stats');
  },

  /**
   * Get recent purchases
   */
  async getRecentPurchases(limit = 5) {
    return fetchApi(`/users/purchases?limit=${limit}`);
  },
};

/**
 * Purchases API
 */
export const purchasesApi = {
  /**
   * Get all user purchases
   */
  async getPurchases(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);

    return fetchApi(`/users/purchases${query.toString() ? `?${query}` : ''}`);
  },

  /**
   * Get purchase by ID
   */
  async getPurchaseById(id: string) {
    return fetchApi(`/users/purchases/${id}`);
  },

  /**
   * Download invoice
   */
  async downloadInvoice(id: string) {
    const url = `${API_BASE_URL}/users/purchases/${id}/invoice`;
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }

    return response.blob();
  },
};

/**
 * License Keys API
 */
export const licenseKeysApi = {
  /**
   * Get all user license keys
   */
  async getLicenseKeys(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);

    return fetchApi(`/users/license-keys${query.toString() ? `?${query}` : ''}`);
  },

  /**
   * Get license key by ID
   */
  async getLicenseKeyById(id: string) {
    return fetchApi(`/users/license-keys/${id}`);
  },
};

/**
 * User Profile API
 */
export const usersApi = {
  /**
   * Get current user profile
   */
  async getProfile() {
    return fetchApi('/users/profile');
  },

  /**
   * Update user profile
   */
  async updateProfile(data: { name?: string }) {
    return fetchApi('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
