export interface ApiResponse<T> {
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface SuccessResponse {
  message: string;
}
