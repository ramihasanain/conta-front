const BASE_URL = 'http://127.0.0.1:8000/api';

export const apiClient = {
  async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = sessionStorage.getItem('access_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // In a robust app, we would attempt to refresh the token here.
      // For now, we clear the session and force a login.
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'API request failed');
    }

    // Return empty object for 204 No Content
    if (response.status === 204) return {};
    
    return response.json();
  },

  get(endpoint: string, options?: RequestInit) {
    return this.fetchWithAuth(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, body: any, options?: RequestInit) {
    return this.fetchWithAuth(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  postFormData(endpoint: string, formData: FormData, options?: RequestInit) {
    const token = sessionStorage.getItem('access_token');
    const headers = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    };
    // Do NOT set Content-Type directly here. The browser sets it with the boundary payload automatically.
    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method: 'POST',
      body: formData,
      headers
    }).then(async res => {
      if (res.status === 401) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const error: any = new Error(err.detail || 'API request failed');
        error.is_duplicate = err.is_duplicate;
        throw error;
      }
      return res.json();
    });
  },

  put(endpoint: string, body: any, options?: RequestInit) {
    return this.fetchWithAuth(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint: string, body: any, options?: RequestInit) {
    return this.fetchWithAuth(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint: string, options?: RequestInit) {
    return this.fetchWithAuth(endpoint, { ...options, method: 'DELETE' });
  }
};
