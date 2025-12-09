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
   * Validates that a session token is provided
   * @param session - Session token to validate
   * @throws HttpException if session is missing
   */
  private validateSession(session: string): void {
    if (!session) {
      throw new HttpException(
        'Session token is required',
        HttpStatus.BAD_REQUEST,
      );
    }
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
      this.validateSession(session);

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
      this.validateSession(session);

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
      this.validateSession(session);

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
      this.validateSession(session);

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
   * Get aggregated statistics for all user accounts
   * @param session - Session token
   * @returns Aggregated account statistics (total balance, total profit, average monthly gain)
   */
  async getAggregatedAccounts(session: string): Promise<{
    totalBalance: number;
    totalProfit: number;
    averageMonthlyReturn: number;
    totalAccounts: number;
  }> {
    try {
      this.validateSession(session);

      const accountsResponse = await this.getMyAccounts(session);
      const accounts = accountsResponse?.accounts || [];

      if (!Array.isArray(accounts) || accounts.length === 0) {
        return {
          totalBalance: 0,
          totalProfit: 0,
          averageMonthlyReturn: 0,
          totalAccounts: 0,
        };
      }

      let totalBalance = 0;
      let totalProfit = 0;
      let averageMonthlyReturn = 0;
      let accountsWithMonthly = 0;

      accounts.forEach((account: any) => {
        // Sum balances
        if (account.balance !== undefined && account.balance !== null) {
          totalBalance += Number(account.balance) || 0;
        }

        // Sum profits
        if (account.profit !== undefined && account.profit !== null) {
          totalProfit += Number(account.profit) || 0;
        }

        // Calculate average return (monthly return percentage)
        if (account.monthly !== undefined && account.monthly !== null) {
          averageMonthlyReturn += Number(account.monthly) || 0;
          accountsWithMonthly++;
        }
      });

      const averageMonthlyReturnPercentage =
        accountsWithMonthly > 0 ? averageMonthlyReturn / accountsWithMonthly : 0;

      return {
        totalBalance: Number(totalBalance.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        averageMonthlyReturn: Number(averageMonthlyReturnPercentage.toFixed(2)),
        totalAccounts: accounts.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch aggregated accounts: ${error.message}`,
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
      this.validateSession(session);

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
   * Parse date string in format "MM/DD/YYYY HH:mm" to Date object
   * @param dateString - Date string in format "MM/DD/YYYY HH:mm"
   * @returns Date object or null if parsing fails
   */
  private parseDate(dateString: string): Date | null {
    try {
      // Format: "09/14/2024 18:24" -> MM/DD/YYYY HH:mm
      const [datePart, timePart] = dateString.split(' ');
      if (!datePart || !timePart) return null;

      const [month, day, year] = datePart.split('/').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      if (
        isNaN(month) ||
        isNaN(day) ||
        isNaN(year) ||
        isNaN(hours) ||
        isNaN(minutes)
      ) {
        return null;
      }

      return new Date(year, month - 1, day, hours, minutes);
    } catch (error) {
      return null;
    }
  }

  /**
   * Format milliseconds to human-readable string
   * @param ms - Milliseconds
   * @returns Formatted string like "1h 30m 15s"
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (remainingHours > 0) parts.push(`${remainingHours}h`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
    if (remainingSeconds > 0 || parts.length === 0)
      parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  }

  /**
   * Get average trade length from history
   * @param session - Session token
   * @param accountId - Account ID
   * @returns Average trade length statistics
   */
  async getAverageTradeLength(
    session: string,
    accountId: string,
  ): Promise<{
    averageTradeLengthMs: number;
    averageTradeLengthFormatted: string;
    totalTrades: number;
  }> {
    try {
      this.validateSession(session);

      if (!accountId) {
        throw new HttpException(
          'Account ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const historyResponse = await this.getHistory(session, accountId);
      
      // Try to find history records in different possible locations
      let records: any[] = [];
      
      if (Array.isArray(historyResponse)) {
        records = historyResponse;
      } else if (Array.isArray((historyResponse as any).history)) {
        records = (historyResponse as any).history;
      } else if (Array.isArray((historyResponse as any).data)) {
        records = (historyResponse as any).data;
      } else if (Array.isArray((historyResponse as any).trades)) {
        records = (historyResponse as any).trades;
      } else if (
        (historyResponse as any).data &&
        typeof (historyResponse as any).data === 'object'
      ) {
        const dataObj = (historyResponse as any).data;
        if (Array.isArray(dataObj.history)) {
          records = dataObj.history;
        } else if (Array.isArray(dataObj.trades)) {
          records = dataObj.trades;
        } else if (Array.isArray(dataObj.data)) {
          records = dataObj.data;
        }
      }

      if (!Array.isArray(records) || records.length === 0) {
        return {
          averageTradeLengthMs: 0,
          averageTradeLengthFormatted: '0s',
          totalTrades: 0,
        };
      }

      let totalTradeLengthMs = 0;
      let validTrades = 0;

      records.forEach((record: any) => {
        // Handle nested array structure if present
        const trade = Array.isArray(record) ? record[0] : record;

        if (!trade || !trade.openTime || !trade.closeTime) {
          return;
        }

        const openTime = this.parseDate(trade.openTime);
        const closeTime = this.parseDate(trade.closeTime);

        if (openTime && closeTime) {
          const tradeLength = closeTime.getTime() - openTime.getTime();
          console.log("tradeLength",tradeLength)
          if (tradeLength >= 0) {
            // Only count valid trades (closeTime >= openTime)
            totalTradeLengthMs += tradeLength;
            validTrades++;
          }
        }
      });

      const averageTradeLengthMs =
        validTrades > 0 ? totalTradeLengthMs / validTrades : 0;

      return {
        averageTradeLengthMs: Math.round(averageTradeLengthMs),
        averageTradeLengthFormatted: this.formatDuration(averageTradeLengthMs),
        totalTrades: records.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to calculate average trade length: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get balance profitability between start and end date using daily data
   * @param session - Session token
   * @param accountId - Account ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Profitability data
   */
  async getBalanceProfitability(
    session: string,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    startBalance: number;
    endBalance: number;
    profitability: number;
    profitabilityPercent: number;
  }> {
    try {
      this.validateSession(session);

      if (!accountId) {
        throw new HttpException(
          'Account ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!startDate || !endDate) {
        throw new HttpException(
          'Start date and end date are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const dataDaily = await this.getDataDaily(
        session,
        accountId,
        startDate,
        endDate,
      );

      // Extract records flexibly from the daily data response
      let records: any[] = [];
      if (Array.isArray((dataDaily as any).dataDaily)) {
        records = (dataDaily as any).dataDaily;
      } else if (Array.isArray((dataDaily as any).data)) {
        records = (dataDaily as any).data;
      } else if (Array.isArray((dataDaily as any).records)) {
        records = (dataDaily as any).records;
      } else if (Array.isArray(dataDaily)) {
        records = dataDaily as any[];
      } else if (
        (dataDaily as any).data &&
        typeof (dataDaily as any).data === 'object'
      ) {
        const dataObj = (dataDaily as any).data;
        if (Array.isArray(dataObj.dataDaily)) {
          records = dataObj.dataDaily;
        } else if (Array.isArray(dataObj.records)) {
          records = dataObj.records;
        } else if (Array.isArray(dataObj.data)) {
          records = dataObj.data;
        }
      }

      // Normalize records to plain objects (handle nested array items)
      const normalized: any[] = Array.isArray(records)
        ? records
            .map((item) => (Array.isArray(item) ? item[0] : item))
            .filter((item) => !!item)
        : [];

      if (normalized.length === 0) {
        return {
          startBalance: 0,
          endBalance: 0,
          profitability: 0,
          profitabilityPercent: 0,
        };
      }

      // Helper to find a balance for a given date (match exact or prefix)
      const getBalanceForDate = (targetDate: string): number | null => {
        const match = normalized.find((entry) => {
          if (!entry) return false;
          const dateValue =
            entry.date || entry.time || entry.timestamp || entry.day;
          if (!dateValue) return false;
          const dateStr = String(dateValue);
          return (
            dateStr === targetDate ||
            dateStr.startsWith(targetDate) ||
            dateStr.includes(targetDate)
          );
        });
        if (match && match.balance !== undefined && match.balance !== null) {
          return Number(match.balance) || 0;
        }
        return null;
      };

      let startBalance = getBalanceForDate(startDate);
      let endBalance = getBalanceForDate(endDate);

      // Fallback: use first and last records if exact date matches not found
      if (startBalance === null && normalized.length > 0) {
        startBalance =
          normalized[0].balance !== undefined && normalized[0].balance !== null
            ? Number(normalized[0].balance) || 0
            : 0;
      }
      if (endBalance === null && normalized.length > 0) {
        const last = normalized[normalized.length - 1];
        endBalance =
          last.balance !== undefined && last.balance !== null
            ? Number(last.balance) || 0
            : 0;
      }

      // If still missing balances, default to 0 to avoid NaN
      startBalance = startBalance ?? 0;
      endBalance = endBalance ?? 0;

      const profitability =
        startBalance !== 0
          ? (endBalance - startBalance) / endBalance
          : 0;

      return {
        startBalance: Number(startBalance.toFixed(2)),
        endBalance: Number(endBalance.toFixed(2)),
        profitability: Number(profitability.toFixed(6)),
        profitabilityPercent: Number((profitability * 100).toFixed(2)),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to calculate balance profitability: ${error.message}`,
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
      this.validateSession(session);

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

      const response: any = await this.makeAuthenticatedRequest(
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

      // Calculate total profit from all records
      let totalProfit = 0;

      // Try to find records in different possible locations in the response
      // The response might have data in response.data, response.records, or directly as an array
      let records: any[] = [];

      if (Array.isArray(response.dataDaily)) {
        records = response.dataDaily;
      }

      // Sum up all profit values from records
      if (Array.isArray(records) && records.length > 0) {
        records.forEach((recordArr: any) => {
          const record = recordArr[0]; // extract object from inner array

          if (!record) return;

          const profitValue =
            record.profit !== undefined ? record.profit : record.profite;

          if (profitValue !== undefined && profitValue !== null) {
            totalProfit += Number(profitValue) || 0;
          }
        });
      }

      // Add totalProfite to the response
      return {
        ...response,
        totalProfit: Number(totalProfit.toFixed(2)),
      };
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

