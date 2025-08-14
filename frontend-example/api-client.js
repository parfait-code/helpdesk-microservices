// Configuration API pour le frontend
// Utilisation du reverse proxy Nginx comme point d'entrée unique

// Configuration de base
const API_CONFIG = {
  // Base URL unique pour tous les services via le reverse proxy
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  
  // Endpoints des différents services
  ENDPOINTS: {
    AUTH: '/api/auth',
    USERS: '/api/users', 
    TICKETS: '/api/tickets',
    FILES: '/api/files'
  },
  
  // Configuration des timeouts
  TIMEOUT: 30000,
  
  // Headers par défaut
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Classe API pour gérer les appels vers les microservices
class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.defaultHeaders = API_CONFIG.HEADERS;
  }
  
  // Méthode générique pour les requêtes
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      timeout: this.timeout,
      ...options
    };
    
    // Ajouter le token d'authentification si disponible
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }
  
  // Méthodes spécifiques pour chaque service
  
  // AUTH SERVICE
  async login(credentials) {
    return this.request(`${API_CONFIG.ENDPOINTS.AUTH}/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }
  
  async logout() {
    return this.request(`${API_CONFIG.ENDPOINTS.AUTH}/logout`, {
      method: 'POST'
    });
  }
  
  async refreshToken() {
    return this.request(`${API_CONFIG.ENDPOINTS.AUTH}/refresh`, {
      method: 'POST'
    });
  }
  
  // USER SERVICE
  async getUsers() {
    return this.request(`${API_CONFIG.ENDPOINTS.USERS}`);
  }
  
  async getUserById(id) {
    return this.request(`${API_CONFIG.ENDPOINTS.USERS}/${id}`);
  }
  
  async createUser(userData) {
    return this.request(`${API_CONFIG.ENDPOINTS.USERS}`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
  
  async updateUser(id, userData) {
    return this.request(`${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }
  
  // TICKET SERVICE
  async getTickets() {
    return this.request(`${API_CONFIG.ENDPOINTS.TICKETS}`);
  }
  
  async getTicketById(id) {
    return this.request(`${API_CONFIG.ENDPOINTS.TICKETS}/${id}`);
  }
  
  async createTicket(ticketData) {
    return this.request(`${API_CONFIG.ENDPOINTS.TICKETS}`, {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });
  }
  
  async updateTicket(id, ticketData) {
    return this.request(`${API_CONFIG.ENDPOINTS.TICKETS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData)
    });
  }
  
  async deleteTicket(id) {
    return this.request(`${API_CONFIG.ENDPOINTS.TICKETS}/${id}`, {
      method: 'DELETE'
    });
  }
  
  // FILE SERVICE
  async uploadFile(ticketId, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ticketId', ticketId);
    
    return this.request(`${API_CONFIG.ENDPOINTS.FILES}/upload`, {
      method: 'POST',
      headers: {
        // Ne pas définir Content-Type pour FormData, le navigateur le fera automatiquement
        ...Object.fromEntries(
          Object.entries(this.defaultHeaders).filter(([key]) => key !== 'Content-Type')
        )
      },
      body: formData
    });
  }
  
  async getFilesByTicketId(ticketId) {
    return this.request(`${API_CONFIG.ENDPOINTS.FILES}/ticket/${ticketId}`);
  }
  
  async downloadFile(fileId) {
    return this.request(`${API_CONFIG.ENDPOINTS.FILES}/${fileId}/download`);
  }
  
  async deleteFile(fileId) {
    return this.request(`${API_CONFIG.ENDPOINTS.FILES}/${fileId}`, {
      method: 'DELETE'
    });
  }
  
  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Instance singleton de l'API client
const apiClient = new ApiClient();

export default apiClient;
export { API_CONFIG };
