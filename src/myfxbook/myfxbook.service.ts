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
      this.logger.error(
        `Error during Myfxbook login: ${error.message}`,
        error.stack,
      );
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
      this.logger.error(
        `Error making authenticated request to ${endpoint}: ${error.message}`,
      );
      throw new HttpException(
        `Myfxbook API request failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

