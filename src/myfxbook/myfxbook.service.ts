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
    profitabilityPercent: number;
    peakBalance: number;
    troughBalance: number;
    drawdownPercent: number;
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
          profitabilityPercent: 0,
          peakBalance: 0,
          troughBalance: 0,
          drawdownPercent: 0,
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

      // Calculate drawdown: find peak balance, then find trough (lowest point after peak)
      let peakBalance = 0;
      let peakIndex = -1;

      // Find the peak balance (highest balance in all records)
      normalized.forEach((record, index) => {
        const balance =
          record.balance !== undefined && record.balance !== null
            ? Number(record.balance) || 0
            : 0;
        if (balance > peakBalance) {
          peakBalance = balance;
          peakIndex = index;
        }
      });

      // Find the trough (lowest balance after the peak, before recovery)
      let troughBalance = peakBalance;

      if (peakIndex >= 0 && peakIndex < normalized.length - 1) {
        let minBalanceAfterPeak = peakBalance;
        let foundDrop = false;

        // Track the minimum balance after the peak
        for (let i = peakIndex + 1; i < normalized.length; i++) {
          const balance =
            normalized[i].balance !== undefined &&
            normalized[i].balance !== null
              ? Number(normalized[i].balance) || 0
              : 0;

          // Check if balance dropped from peak
          if (balance < peakBalance) {
            foundDrop = true;
          }

          // If balance dropped, track the minimum (trough)
          if (foundDrop && balance < minBalanceAfterPeak) {
            minBalanceAfterPeak = balance;
          }

          // If balance recovers (increases) after a drop, we've found the trough
          // The trough is the lowest point before recovery
          if (
            foundDrop &&
            minBalanceAfterPeak < peakBalance &&
            balance > minBalanceAfterPeak
          ) {
            // Recovery has started, trough is the minimum we found
            troughBalance = minBalanceAfterPeak;
            break;
          }
        }

        // If we found a drop but no recovery yet, use the minimum found
        if (foundDrop && minBalanceAfterPeak < peakBalance) {
          troughBalance = minBalanceAfterPeak;
        }
      }

      // Calculate drawdown: (peak - trough) / peak * 100
      const drawdown =
        peakBalance !== 0 ? (peakBalance - troughBalance) / peakBalance : 0;

      return {
        startBalance: Number(startBalance.toFixed(2)),
        endBalance: Number(endBalance.toFixed(2)),
        profitabilityPercent: Number((profitability * 100).toFixed(2)),
        peakBalance: Number(peakBalance.toFixed(2)),
        troughBalance: Number(troughBalance.toFixed(2)),
        drawdownPercent: Number((drawdown * 100).toFixed(2)),
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

  /**
   * Format date to YYYY-MM-DD format
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get start of week (Monday)
   */
  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const result = new Date(d);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get start of month
   */
  private getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get start of year
   */
  private getStartOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1);
  }

  /**
   * Extract gain value from API response
   */
  private extractGainValue(response: any): number {
    // Try different possible locations for gain value
    if (response.gain !== undefined && response.gain !== null) {
      return Number(response.gain) || 0;
    }
    if (response.data?.gain !== undefined && response.data?.gain !== null) {
      return Number(response.data.gain) || 0;
    }
    if (response.value !== undefined && response.value !== null) {
      return Number(response.value) || 0;
    }
    if (response.data?.value !== undefined && response.data?.value !== null) {
      return Number(response.data.value) || 0;
    }
    // If response is an array, try to get gain from first item
    if (Array.isArray(response) && response.length > 0) {
      const first = response[0];
      if (first.gain !== undefined && first.gain !== null) {
        return Number(first.gain) || 0;
      }
    }
    return 0;
  }

  /**
   * Call get-gain API for a specific date range
   */
  private async getGainForPeriod(
    session: string,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ gain: number; startDate: string; endDate: string }> {
    try {
      const params: Record<string, any> = {
        id: accountId,
        start: startDate,
        end: endDate,
      };

      const response = await this.makeAuthenticatedRequest(
        'get-gain.json',
        session,
        params,
      );

      if (response.error) {
        this.logger.warn(
          `Failed to fetch gain for ${startDate} to ${endDate}: ${response.message}`,
        );
        return { gain: 0, startDate, endDate };
      }

      const gain = this.extractGainValue(response);
      return { gain, startDate, endDate };
    } catch (error) {
      this.logger.error(
        `Error fetching gain for ${startDate} to ${endDate}: ${error.message}`,
      );
      return { gain: 0, startDate, endDate };
    }
  }

  /**
   * Get gain comparisons for multiple periods (today/yesterday, this week/previous week, etc.)
   * @param session - Session token
   * @param accountId - Account ID
   * @returns Gain comparison data for all periods
   */
  async getGainComparisons(
    session: string,
    accountId: string,
  ): Promise<{
    todayVsYesterday: {
      current: { gain: number; startDate: string; endDate: string };
      previous: { gain: number; startDate: string; endDate: string };
      difference: number;
      differencePercent: number;
    };
    thisWeekVsPreviousWeek: {
      current: { gain: number; startDate: string; endDate: string };
      previous: { gain: number; startDate: string; endDate: string };
      difference: number;
      differencePercent: number;
    };
    thisMonthVsPreviousMonth: {
      current: { gain: number; startDate: string; endDate: string };
      previous: { gain: number; startDate: string; endDate: string };
      difference: number;
      differencePercent: number;
    };
    thisYearVsPreviousYear: {
      current: { gain: number; startDate: string; endDate: string };
      previous: { gain: number; startDate: string; endDate: string };
      difference: number;
      differencePercent: number;
    };
  }> {
    try {
      this.validateSession(session);

      if (!accountId) {
        throw new HttpException(
          'Account ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Today vs Yesterday
      const todayStr = this.formatDate(today);
      const yesterdayStr = this.formatDate(yesterday);
      const [todayGain, yesterdayGain] = await Promise.all([
        this.getGainForPeriod(session, accountId, todayStr, todayStr),
        this.getGainForPeriod(session, accountId, yesterdayStr, yesterdayStr),
      ]);

      // This week vs Previous week
      const thisWeekStart = this.getStartOfWeek(today);
      const thisWeekEnd = new Date(today);
      const previousWeekEnd = new Date(thisWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
      const previousWeekStart = this.getStartOfWeek(previousWeekEnd);

      const [thisWeekGain, previousWeekGain] = await Promise.all([
        this.getGainForPeriod(
          session,
          accountId,
          this.formatDate(thisWeekStart),
          this.formatDate(thisWeekEnd),
        ),
        this.getGainForPeriod(
          session,
          accountId,
          this.formatDate(previousWeekStart),
          this.formatDate(previousWeekEnd),
        ),
      ]);

      // This month vs Previous month
      const thisMonthStart = this.getStartOfMonth(today);
      const thisMonthEnd = new Date(today);
      const previousMonthEnd = new Date(thisMonthStart);
      previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);
      const previousMonthStart = this.getStartOfMonth(previousMonthEnd);

      const [thisMonthGain, previousMonthGain] = await Promise.all([
        this.getGainForPeriod(
          session,
          accountId,
          this.formatDate(thisMonthStart),
          this.formatDate(thisMonthEnd),
        ),
        this.getGainForPeriod(
          session,
          accountId,
          this.formatDate(previousMonthStart),
          this.formatDate(previousMonthEnd),
        ),
      ]);

      // This year vs Previous year
      const thisYearStart = this.getStartOfYear(today);
      const thisYearEnd = new Date(today);
      const previousYearEnd = new Date(thisYearStart);
      previousYearEnd.setDate(previousYearEnd.getDate() - 1);
      const previousYearStart = this.getStartOfYear(previousYearEnd);

      const [thisYearGain, previousYearGain] = await Promise.all([
        this.getGainForPeriod(
          session,
          accountId,
          this.formatDate(thisYearStart),
          this.formatDate(thisYearEnd),
        ),
        this.getGainForPeriod(
          session,
          accountId,
          this.formatDate(previousYearStart),
          this.formatDate(previousYearEnd),
        ),
      ]);

      // Helper function to calculate difference
      const calculateDifference = (
        current: { gain: number },
        previous: { gain: number },
      ) => {
        const diff = current.gain - previous.gain;
        const diffPercent =
          previous.gain !== 0 ? (diff / Math.abs(previous.gain)) * 100 : 0;
        return {
          difference: Number(diff.toFixed(2)),
          differencePercent: Number(diffPercent.toFixed(2)),
        };
      };

      const todayDiff = calculateDifference(todayGain, yesterdayGain);
      const weekDiff = calculateDifference(thisWeekGain, previousWeekGain);
      const monthDiff = calculateDifference(thisMonthGain, previousMonthGain);
      const yearDiff = calculateDifference(thisYearGain, previousYearGain);

      return {
        todayVsYesterday: {
          current: todayGain,
          previous: yesterdayGain,
          ...todayDiff,
        },
        thisWeekVsPreviousWeek: {
          current: thisWeekGain,
          previous: previousWeekGain,
          ...weekDiff,
        },
        thisMonthVsPreviousMonth: {
          current: thisMonthGain,
          previous: previousMonthGain,
          ...monthDiff,
        },
        thisYearVsPreviousYear: {
          current: thisYearGain,
          previous: previousYearGain,
          ...yearDiff,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get gain comparisons: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

