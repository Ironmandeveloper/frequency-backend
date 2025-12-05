import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  MyfxbookLoginResponse,
  MyfxbookApiResponse,
} from './dto/myfxbook-response.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class MyfxbookService {
  private readonly logger = new Logger(MyfxbookService.name);
  private readonly apiUrl: string;
  private readonly defaultEmail: string;
  private readonly defaultPassword: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('myfxbook.apiUrl') || '';
    this.defaultEmail = this.configService.get<string>('myfxbook.email') || '';
    this.defaultPassword =
      this.configService.get<string>('myfxbook.password') || '';
  }

  /**
   * Authenticate with Myfxbook API
   * @param loginDto - Login credentials (optional, uses env vars if not provided)
   * @returns Session token
   */
  async login(loginDto?: LoginDto): Promise<string> {
    try {
      const email = loginDto?.email || this.defaultEmail;
      const password = loginDto?.password || this.defaultPassword;

      if (!email || !password) {
        throw new HttpException(
          'Myfxbook credentials are required. Please set MYFXBOOK_EMAIL and MYFXBOOK_PASSWORD in your .env file or provide them in the request.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const loginUrl = `${this.apiUrl}/login.json`;
      const requestParams = {
        email: email.trim(),
        password: password.trim(),
      };

      const response = await firstValueFrom(
        this.httpService.get<MyfxbookLoginResponse>(loginUrl, {
          params: requestParams,
        }),
      );

      if (response.data.error || !response.data.session) {
        const errorMessage =
          response.data.message || response.data.error || 'Authentication failed';
        throw new HttpException(
          `Myfxbook authentication failed: ${errorMessage}`,
          HttpStatus.UNAUTHORIZED,
        );
      }

      return response.data.session;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Handle axios errors specifically
      if (error.response) {
        throw new HttpException(
          `Myfxbook API error: ${error.response.data?.message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Failed to authenticate with Myfxbook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test authentication by attempting to login
   * @param loginDto - Optional login credentials
   * @returns Authentication test result
   */
  async testAuthentication(loginDto?: LoginDto): Promise<{
    success: boolean;
    session?: string;
    message: string;
  }> {
    try {
      const session = await this.login(loginDto);
      return {
        success: true,
        session,
        message: 'Myfxbook authentication successful',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof HttpException
            ? error.message
            : 'Authentication test failed',
      };
    }
  }

  /**
   * Make an authenticated API call to Myfxbook
   * @param endpoint - API endpoint (without base URL)
   * @param session - Session token
   * @param params - Additional parameters
   * @returns API response
   */
  async makeAuthenticatedRequest<T = any>(
    endpoint: string,
    session: string,
    params?: Record<string, any>,
  ): Promise<MyfxbookApiResponse<T>> {
    try {
      const url = `${this.apiUrl}/${endpoint}`;
      const response = await firstValueFrom(
        this.httpService.get<MyfxbookApiResponse<T>>(url, {
          params: {
            session,
            ...params,
          },
        }),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Myfxbook API request failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get gain data for an account
   * @param session - Session token
   * @param accountId - Account ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Gain data
   */
  async getGain(
    session: string,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      if (!session) {
        throw new HttpException(
          'Session token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!accountId) {
        throw new HttpException(
          'Account ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const params: Record<string, any> = {
        id: accountId,
      };

      if (startDate) {
        params.start = startDate;
      }

      if (endDate) {
        params.end = endDate;
      }

      const response = await this.makeAuthenticatedRequest(
        'get-gain.json',
        session,
        params,
      );

      if (response.error) {
        const errorMessage = response.message || 'Failed to fetch gain data';
        throw new HttpException(
          `Failed to fetch gain data: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch gain data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get daily gain data for an account
   * @param session - Session token
   * @param accountId - Account ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Daily gain data
   */
  async getDailyGain(
    session: string,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      if (!session) {
        throw new HttpException(
          'Session token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!accountId) {
        throw new HttpException(
          'Account ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const params: Record<string, any> = {
        id: accountId,
      };

      if (startDate) {
        params.start = startDate;
      }

      if (endDate) {
        params.end = endDate;
      }

      const response = await this.makeAuthenticatedRequest(
        'get-daily-gain.json',
        session,
        params,
      );

      if (response.error) {
        const errorMessage = response.message || 'Failed to fetch daily gain data';
        throw new HttpException(
          `Failed to fetch daily gain data: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch daily gain data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Logout from Myfxbook API
   * @param session - Session token to invalidate
   * @returns Logout result
   */
  async logout(session: string): Promise<any> {
    try {
      if (!session) {
        throw new HttpException(
          'Session token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.makeAuthenticatedRequest(
        'logout.json',
        session,
      );

      if (response.error) {
        const errorMessage = response.message || 'Failed to logout';
        throw new HttpException(
          `Failed to logout: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to logout: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's Myfxbook accounts
   * @param session - Session token
   * @returns List of user accounts
   */
  async getMyAccounts(session: string): Promise<any> {
    try {
      if (!session) {
        throw new HttpException(
          'Session token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.makeAuthenticatedRequest(
        'get-my-accounts.json',
        session,
      );

      if (response.error) {
        const errorMessage = response.message || 'Failed to fetch accounts';
        throw new HttpException(
          `Failed to fetch accounts: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch accounts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get trade history for an account
   * @param session - Session token
   * @param accountId - Account ID
   * @returns Trade history
   */
  async getHistory(session: string, accountId: string): Promise<any> {
    try {
      if (!session) {
        throw new HttpException(
          'Session token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!accountId) {
        throw new HttpException(
          'Account ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.makeAuthenticatedRequest(
        'get-history.json',
        session,
        { id: accountId },
      );

      if (response.error) {
        const errorMessage = response.message || 'Failed to fetch history';
        throw new HttpException(
          `Failed to fetch history: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

   /**
   * Get daily data for an account
   * @param session - Session token
   * @param accountId - Account ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Daily data
   */
  async getDataDaily(
    session: string,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      if (!session) {
        throw new HttpException(
          'Session token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!accountId) {
        throw new HttpException(
          'Account ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const params: Record<string, any> = {
        id: accountId,
      };

      if (startDate) {
        params.start = startDate;
      }

      if (endDate) {
        params.end = endDate;
      }

      const response = await this.makeAuthenticatedRequest(
        'get-data-daily.json',
        session,
        params,
      );

      if (response.error) {
        const errorMessage = response.message || 'Failed to fetch daily data';
        throw new HttpException(
          `Failed to fetch daily data: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch daily data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

