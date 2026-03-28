const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (this.token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${this.token}`
      };
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  post<T>(endpoint: string, body: any): Promise<T> {
    return this.makeRequest('POST', endpoint, body);
  }

  get<T>(endpoint: string): Promise<T> {
    return this.makeRequest('GET', endpoint);
  }

  put<T>(endpoint: string, body: any): Promise<T> {
    return this.makeRequest('PUT', endpoint, body);
  }
}

export const apiClient = new ApiClient();
