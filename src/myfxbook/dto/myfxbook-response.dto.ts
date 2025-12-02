export interface MyfxbookLoginResponse {
  session?: string;
  error?: string;
  message?: string;
}

export interface MyfxbookApiResponse<T = any> {
  error?: boolean;
  message?: string;
  session?: string;
  data?: T;
}

