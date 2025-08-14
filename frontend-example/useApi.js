// Hook React personnalisé pour utiliser l'API Gateway
// Exemple d'implémentation avec gestion d'état et cache

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from './api-client';

// Hook pour les requêtes API avec gestion d'état
export const useApi = (endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  
  const {
    autoFetch = false,
    dependencies = [],
    cache = false,
    cacheTime = 5 * 60 * 1000 // 5 minutes
  } = options;
  
  // Cache simple
  const cacheRef = useRef(new Map());
  
  const fetchData = useCallback(async (customOptions = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    // Vérifier le cache
    if (cache) {
      const cacheKey = `${endpoint}_${JSON.stringify(customOptions)}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        return cached.data;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.request(endpoint, {
        signal: abortControllerRef.current.signal,
        ...customOptions
      });
      
      setData(response);
      
      // Mettre en cache
      if (cache) {
        const cacheKey = `${endpoint}_${JSON.stringify(customOptions)}`;
        cacheRef.current.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Une erreur est survenue');
        console.error('API Error:', err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, cache, cacheTime]);
  
  // Auto-fetch au montage du composant
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, fetchData, ...dependencies]);
  
  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearCache: () => cacheRef.current.clear()
  };
};

// Hook spécialisé pour l'authentification
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Vérifier si l'utilisateur est connecté au chargement
    const token = localStorage.getItem('authToken');
    if (token) {
      // Vérifier la validité du token
      checkTokenValidity();
    }
  }, []);
  
  const checkTokenValidity = async () => {
    try {
      const response = await apiClient.request('/api/auth/me');
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      // Token invalide, déconnecter l'utilisateur
      logout();
    }
  };
  
  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await apiClient.login(credentials);
      
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Erreur lors de la déconnexion:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
    }
  };
  
  const refreshToken = async () => {
    try {
      const response = await apiClient.refreshToken();
      localStorage.setItem('authToken', response.token);
      return response.token;
    } catch (error) {
      logout();
      throw error;
    }
  };
  
  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshToken
  };
};

// Hook pour les tickets avec pagination et filtrage
export const useTickets = (filters = {}, page = 1, limit = 10) => {
  const [tickets, setTickets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await apiClient.request(`/api/tickets?${queryParams}`);
      
      setTickets(response.tickets || []);
      setTotalCount(response.total || 0);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);
  
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);
  
  const createTicket = async (ticketData) => {
    try {
      const newTicket = await apiClient.createTicket(ticketData);
      setTickets(prev => [newTicket, ...prev]);
      return newTicket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  };
  
  const updateTicket = async (ticketId, updates) => {
    try {
      const updatedTicket = await apiClient.updateTicket(ticketId, updates);
      setTickets(prev => 
        prev.map(ticket => 
          ticket.id === ticketId ? updatedTicket : ticket
        )
      );
      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };
  
  const deleteTicket = async (ticketId) => {
    try {
      await apiClient.deleteTicket(ticketId);
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  };
  
  return {
    tickets,
    totalCount,
    loading,
    error,
    refetch: fetchTickets,
    createTicket,
    updateTicket,
    deleteTicket
  };
};

// Hook pour l'upload de fichiers avec suivi de progression
export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const uploadFile = async (ticketId, file, onProgress) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      // Utilisation de XMLHttpRequest pour suivre la progression
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ticketId', ticketId);
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setProgress(Math.round(percentComplete));
            onProgress?.(Math.round(percentComplete));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Upload failed'));
        };
        
        // Configuration de la requête
        const token = localStorage.getItem('authToken');
        xhr.open('POST', `${process.env.REACT_APP_API_URL}/api/files/upload`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        xhr.send(formData);
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };
  
  return {
    uploading,
    progress,
    error,
    uploadFile
  };
};

// Hook pour les notifications en temps réel (WebSocket)
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  
  useEffect(() => {
    // Établir la connexion WebSocket
    const connectWebSocket = () => {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setConnected(true);
        console.log('WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Garder les 50 dernières
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setConnected(false);
        console.log('WebSocket disconnected, attempting to reconnect...');
        // Reconnexion automatique après 5 secondes
        setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };
  
  const clearAll = () => {
    setNotifications([]);
  };
  
  return {
    notifications,
    connected,
    markAsRead,
    clearAll,
    unreadCount: notifications.filter(n => !n.read).length
  };
};
