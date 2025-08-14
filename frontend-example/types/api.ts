// types/api.ts - Définitions TypeScript pour l'API Gateway
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    code?: string;
}

// ===========================================
// TYPES D'AUTHENTIFICATION
// ===========================================

export interface User {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'agent' | 'user';
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'user' | 'agent';
}

export interface LoginResponse extends ApiResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

// ===========================================
// TYPES DE TICKETS
// ===========================================

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'technical' | 'billing' | 'general' | 'bug_report';
    ticketNumber: string;
    createdBy: string;
    assignedTo?: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    metadata?: Record<string, any>;
    attachments?: FileAttachment[];
    comments?: TicketComment[];
}

export interface CreateTicketRequest {
    title: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface UpdateTicketRequest {
    title?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    resolution?: string;
    tags?: string[];
}

export interface TicketComment {
    id: string;
    ticketId: string;
    content: string;
    authorId: string;
    authorName: string;
    isInternal: boolean;
    type: 'comment' | 'update' | 'status_change';
    createdAt: string;
}

export interface TicketFilters {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    createdBy?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export interface PaginatedTicketsResponse extends ApiResponse {
    tickets: Ticket[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalTickets: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// ===========================================
// TYPES DE FICHIERS
// ===========================================

export interface FileAttachment {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    description?: string;
    isPublic: boolean;
    ticketId?: string;
    uploadedBy: string;
    uploadedAt: string;
    downloadUrl: string;
    thumbnailUrl?: string;
}

export interface UploadFileRequest {
    file: File;
    ticketId?: string;
    description?: string;
    isPublic?: boolean;
}

export interface UploadFileResponse extends ApiResponse {
    file: FileAttachment;
}

export interface TicketFilesResponse extends ApiResponse {
    files: FileAttachment[];
    totalFiles: number;
    totalSize: number;
}

// ===========================================
// TYPES D'UTILISATEURS
// ===========================================

export interface UserProfile extends User {
    phone?: string;
    bio?: string;
    avatar?: string;
    preferences?: UserPreferences;
    statistics?: UserStatistics;
}

export interface UserPreferences {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    timezone: string;
}

export interface UserStatistics {
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    satisfaction: number;
}

export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bio?: string;
    preferences?: Partial<UserPreferences>;
}

export interface UsersListResponse extends ApiResponse {
    users: User[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalUsers: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// ===========================================
// TYPES UTILITAIRES
// ===========================================

export interface HealthCheckResponse {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    environment?: string;
    dependencies?: Record<string, string>;
    checks?: Record<string, { status: string; message?: string }>;
}

export interface ApiError {
    success: false;
    error: string;
    message: string;
    code?: string;
    details?: Record<string, string[]>;
    timestamp?: string;
}

export interface ValidationError extends ApiError {
    details: Record<string, string[]>;
}

// ===========================================
// OPTIONS DE REQUÊTE
// ===========================================

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retries?: number;
    cache?: boolean;
    cacheTime?: number;
}

export interface ApiClientConfig {
    baseURL: string;
    timeout: number;
    retries: number;
    headers: Record<string, string>;
    interceptors?: {
        request?: Array<(config: RequestOptions) => RequestOptions>;
        response?: Array<(response: Response) => Response>;
    };
}

// ===========================================
// HOOKS PERSONNALISÉS
// ===========================================

export interface UseApiOptions<T> {
    autoFetch?: boolean;
    dependencies?: any[];
    cache?: boolean;
    cacheTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    retry?: boolean;
    retryDelay?: number;
    retryCount?: number;
}

export interface UseApiResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: (options?: RequestOptions) => Promise<T>;
    mutate: (newData: T) => void;
    reset: () => void;
}

// ===========================================
// STATUTS ET CONSTANTES
// ===========================================

export const TICKET_STATUS = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed'
} as const;

export const TICKET_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
} as const;

export const USER_ROLES = {
    ADMIN: 'admin',
    AGENT: 'agent',
    USER: 'user'
} as const;

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
} as const;

// ===========================================
// TYPES POUR WEBSOCKETS (si utilisé)
// ===========================================

export interface WebSocketMessage {
    type: 'notification' | 'ticket_update' | 'user_activity';
    payload: any;
    timestamp: string;
}

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    userId: string;
    read: boolean;
    createdAt: string;
    metadata?: Record<string, any>;
}

// ===========================================
// TYPES POUR STATISTIQUES/ANALYTICS
// ===========================================

export interface DashboardStats {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    satisfactionRate: number;
    trends: {
        ticketsCreated: Array<{ date: string; count: number }>;
        ticketsResolved: Array<{ date: string; count: number }>;
    };
}

export interface TicketMetrics {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    resolutionTimes: Array<{ period: string; avgTime: number }>;
}

// ===========================================
// EXPORT DE TYPES UTILES
// ===========================================

export type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS];
export type TicketPriority = typeof TICKET_PRIORITY[keyof typeof TICKET_PRIORITY];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
