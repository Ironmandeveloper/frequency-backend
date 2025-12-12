import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  MyfxbookLoginResponse,
  MyfxbookApiResponse,
} from './dto/myfxbook-response.dto';
import { LoginDto } from './dto/login.dto';
import { calculateDifference, calculateDifferences, validateAndDecodeSession } from 'src/common/utils/session.utils';
import { CacheService } from '../cache/cache.service';
import { DEFAULT_ACCOUNT, EXNESS_ACCOUNT, LOW_RISK_ACCOUNT } from 'src/constant/constant';

/**
 * Interface for session metadata stored in Redis
 */
interface SessionMetadata {
  session: string;
  createdAt: number; // Unix timestamp in milliseconds
}

@Injectable()
export class MyfxbookService {
  private readonly logger = new Logger(MyfxbookService.name);
  private readonly apiUrl: string;
  private readonly defaultEmail: string;
  private readonly defaultPassword: string;
  private readonly sessionCacheKey = 'myfxbook:session:default';
  private readonly redisTtlSeconds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
  ) {
    this.apiUrl = this.configService.get<string>('myfxbook.apiUrl') || '';
    this.defaultEmail = this.configService.get<string>('myfxbook.email') || '';
    this.defaultPassword =
      this.configService.get<string>('myfxbook.password') || '';
    this.redisTtlSeconds =
      this.configService.get<number>('redis.ttl') || 30;
  }

  /**
   * Get a cached session or login to create one (auto-cached)
   * This allows backend-managed sessions without requiring the client to pass one.
   */
  /**
   * Check if an API error indicates session expiration
   * @param error - The error object from API call
   * @returns true if error indicates session expiration
   */
  private isSessionExpiredError(error: any): boolean {
    if (!error) return false;

    // Check for common session expiration messages
    const errorMessage = error.message?.toLowerCase() || '';
    const errorResponse = error.response?.data;

    const sessionErrorPatterns = [
      'invalid session',
      'session expired',
      'session not found',
      'unauthorized',
      'authentication failed',
    ];

    // Check error message
    if (sessionErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
      return true;
    }

    // Check API response error
    if (errorResponse?.error && errorResponse?.message) {
      const responseMessage = errorResponse.message.toLowerCase();
      if (sessionErrorPatterns.some(pattern => responseMessage.includes(pattern))) {
        return true;
      }
    }

    // Check HTTP status code (401 Unauthorized usually means session expired)
    if (error.response?.status === 401) {
      return true;
    }

    return false;
  }

  /**
   * Get a cached session or login to create one (auto-cached)
   * Session is stored in Redis permanently (without TTL) with metadata
   * Uses lazy validation - only refreshes session when API calls fail with session error
   * This avoids unnecessary validation API calls to Myfxbook
   * All APIs use this cached session from Redis
   */
  private async getOrCreateSession(): Promise<string> {
    const cachedData = await this.cacheService.get<SessionMetadata>(
      this.sessionCacheKey,
    );
    this.logger.debug(`Checking Redis for session with key: ${this.sessionCacheKey}`);

    if (cachedData?.session) {
      this.logger.debug('Found cached session in Redis - using it without validation');
      this.logger.debug(`Session created at: ${new Date(cachedData.createdAt).toISOString()}`);
      return cachedData.session;
    }

    this.logger.log('No cached session found, calling login service...');
    return this.createAndStoreSession();
  }

  /**
   * Create a new session and store it in Redis with metadata
   * @returns The new session token
   */
  private async createAndStoreSession(): Promise<string> {
    const session = await this.login();

    if (!session) {
      throw new HttpException(
        'Failed to obtain Myfxbook session',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Store session with metadata in Redis permanently
    const sessionMetadata: SessionMetadata = {
      session,
      createdAt: Date.now(),
    };

    this.logger.log(`Storing session in Redis permanently with key: ${this.sessionCacheKey}`);
    const cacheSuccess = await this.cacheService.setPermanent(this.sessionCacheKey, sessionMetadata);

    if (cacheSuccess) {
      this.logger.log('Session successfully stored in Redis (permanent storage, no expiration)');
    } else {
      this.logger.warn('Warning: Session was not found in Redis after storage attempt');
    }

    return session;
  }

  /**
   * Clear cached session (used on logout or when forcing refresh)
   */
  private async clearCachedSession(): Promise<void> {
    await this.cacheService.del(this.sessionCacheKey);
  }

  /**
   * Resolve session: use provided one or fetch cached / new automatically
   */
  private async resolveSession(session?: string): Promise<string> {
    if (session) {
      this.validateSession(session);
      return session;
    }
    return this.getOrCreateSession();
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
   * Validates that an account ID is provided
   * @param accountId - Account ID to validate
   * @throws HttpException if account ID is missing
   */
  private validateAccountId(accountId: string): void {
    if (!accountId) {
      throw new HttpException(
        'Account ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Check if accountId is "default"
   * @param accountId - Account ID to check
   * @returns true if accountId is "default" (case-insensitive)
   */
  private isDefaultAccount(accountId: string): boolean {
    return accountId?.toLowerCase() === 'default';
  }

  /**
   * Get all EXNESS account IDs from constant
   * @returns Array of EXNESS account IDs
   */
  private getExnessAccountIds(): string[] {
    return EXNESS_ACCOUNT.map(String);
  }

  /**
   * Authenticate with Myfxbook API
   * @param loginDto - Login credentials (optional, uses env vars if not provided)
   * @returns Session token
   */
  async login(loginDto?: LoginDto): Promise<string> {
    try {
      this.logger.log('Login API called - authenticating with Myfxbook...');
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
   * Make an authenticated API call to Myfxbook
   * Automatically handles session expiration by refreshing session and retrying
   * @param endpoint - API endpoint (without base URL)
   * @param session - Session token
   * @param params - Additional parameters
   * @param retryOnExpiration - Whether to retry with new session if current one is expired (default: true)
   * @returns API response
   */
  async makeAuthenticatedRequest<T = any>(
    endpoint: string,
    session: string,
    params?: Record<string, any>,
    retryOnExpiration: boolean = true,
  ): Promise<MyfxbookApiResponse<T>> {
    try {
      const url = `${this.apiUrl}/${endpoint}`;
      const decodedSession = validateAndDecodeSession(session);

      const response = await firstValueFrom(
        this.httpService.get<MyfxbookApiResponse<T>>(url, {
          params: {
            session: decodedSession,
            ...params,
          },
        }),
      );

      // Check if response has error indicating session expiration
      if (response.data?.error && this.isSessionExpiredError({ message: response.data.message })) {
        if (retryOnExpiration) {
          this.logger.warn('Session expired detected in API response, refreshing session and retrying...');
          await this.clearCachedSession();
          const newSession = await this.createAndStoreSession();
          // Retry the request with new session (only once to avoid infinite loop)
          return this.makeAuthenticatedRequest<T>(endpoint, newSession, params, false);
        }
      }

      return response.data;
    } catch (error) {
      // Check if error indicates session expiration
      if (this.isSessionExpiredError(error) && retryOnExpiration) {
        this.logger.warn('Session expired detected in API error, refreshing session and retrying...');
        await this.clearCachedSession();
        const newSession = await this.createAndStoreSession();
        // Retry the request with new session (only once to avoid infinite loop)
        return this.makeAuthenticatedRequest<T>(endpoint, newSession, params, false);
      }

      // For other errors, throw as usual
      throw new HttpException(
        `Myfxbook API request failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  /**
   * Get user's Myfxbook accounts
   * @param session - Session token
   * @returns List of user accounts
   */
  async getMyAccounts(session?: string): Promise<any> {
    try {
      const resolvedSession = await this.resolveSession(session);
      // Endpoint-based cache key
      const cacheKey = this.cacheService.generateKey('endpoint:get-my-accounts');
      const cached = await this.cacheService.get<any>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for endpoint:get-my-accounts');
        return cached;
      }

      const response: any = await this.makeAuthenticatedRequest(
        'get-my-accounts.json',
        resolvedSession,
      );

      const accounts = response?.accounts || [];

      const filteredAccounts = accounts.filter((item) =>
        EXNESS_ACCOUNT.includes(String(item.id))
      );

      // Add default account
      let finalResult = [...filteredAccounts, DEFAULT_ACCOUNT];

      // Update name if ID matches LOW_RISK_ACCOUNT
      finalResult = finalResult.map((item) => {
        if (LOW_RISK_ACCOUNT.includes(String(item.id))) {
          return {
            ...item,
            name: `FREQ > LOW RISK`,
          };
        }
        return item;
      });

      if (response.error) {
        const errorMessage = response.message || 'Failed to fetch accounts';
        throw new HttpException(
          `Failed to fetch accounts: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Cache successful response
      this.logger.debug(`Attempting to cache response for key: ${cacheKey}`);
      const cacheSuccess = await this.cacheService.set(cacheKey, filteredAccounts);

      if (cacheSuccess) {
        this.logger.debug('Response successfully cached in Redis');
      } else {
        this.logger.warn('Failed to cache response in Redis - data will not be cached');
      }

      return finalResult;
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
   * @param accountId - Account ID or "default" to aggregate all EXNESS accounts
   * @returns Aggregated account statistics (total balance, total profit, average monthly gain)
   */
  async getAggregatedAccounts(accountId: string): Promise<{
    totalBalance: number;
    totalProfit: number;
    averageMonthlyReturn: number;
  }> {
    try {
      const resolvedSession = await this.resolveSession();

      // Endpoint-based cache key with accountId
      const cacheKey = this.cacheService.generateKey('endpoint:get-aggregated-accounts', accountId);
      const cached = await this.cacheService.get<any>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for endpoint:get-aggregated-accounts');
        return cached;
      }

      // If accountId is "default", aggregate all EXNESS accounts
      if (accountId?.toLowerCase() === 'default') {
        // Get raw accounts from API (not filtered)
        const resolvedSessionForApi = await this.resolveSession();
        const rawResponse: any = await this.makeAuthenticatedRequest(
          'get-my-accounts.json',
          resolvedSessionForApi,
        );

        if (rawResponse.error) {
          const errorMessage = rawResponse.message || 'Failed to fetch accounts';
          throw new HttpException(
            `Failed to fetch accounts: ${errorMessage}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const allAccounts = rawResponse?.accounts || [];

        // Filter EXNESS accounts only
        const exnessAccounts = allAccounts.filter((account: any) =>
          EXNESS_ACCOUNT.includes(String(account.id))
        );

        if (exnessAccounts.length === 0) {
          this.logger.warn('No EXNESS accounts found in API response');
          return {
            totalBalance: 0,
            totalProfit: 0,
            averageMonthlyReturn: 0,
          };
        }

        // Calculate totals and averages for EXNESS accounts
        let totalBalance = 0;
        let totalProfit = 0;
        let totalMonthlyReturn = 0;

        exnessAccounts.forEach((account: any) => {
          totalBalance += Number(account.balance ?? 0);
          totalProfit += Number(account.profit ?? 0);
          totalMonthlyReturn += Number(account.monthly ?? 0);
        });

        const averageMonthlyReturn = exnessAccounts.length > 0
          ? totalMonthlyReturn / exnessAccounts.length
          : 0;

        const result = {
          totalBalance: Number(totalBalance.toFixed(2)),
          totalProfit: Number(totalProfit.toFixed(2)),
          averageMonthlyReturn: Number(averageMonthlyReturn.toFixed(2)),
        };

        // Cache successful response
        await this.cacheService.set(cacheKey, result);
        this.logger.debug(`Aggregated ${exnessAccounts.length} EXNESS accounts for default calculation`);
        return result;
      }

      // Original flow: find specific account by ID
      const accountsResponse = await this.getMyAccounts(resolvedSession);

      const accounts = accountsResponse || [];
      // Find the account object with matching ID
      const account = accounts.find((acc: any) => acc.id == accountId);
      if (!account) {
        return {
          totalBalance: 0,
          totalProfit: 0,
          averageMonthlyReturn: 0,
        };
      }

      const result = {
        totalBalance: Number(account.balance ?? 0),
        totalProfit: Number(account.profit ?? 0),
        averageMonthlyReturn: Number(account.monthly ?? 0),
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;
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
  async getHistory(session: string | undefined, accountId: string): Promise<any> {
    try {
      const resolvedSession = await this.resolveSession(session);
      this.validateAccountId(accountId);

      const cacheKey = this.cacheService.generateKey('myfxbook:history', resolvedSession, accountId);
      const cached = await this.cacheService.get<any>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for getHistory');
        return cached;
      }

      // Handle "default" accountId - combine history from all EXNESS accounts
      if (this.isDefaultAccount(accountId)) {
        const exnessAccountIds = this.getExnessAccountIds();
        const allHistoryPromises = exnessAccountIds.map(id =>
          this.makeAuthenticatedRequest(
            'get-history.json',
            resolvedSession,
            { id },
          ).catch(err => {
            this.logger.warn(`Failed to fetch history for account ${id}: ${err.message}`);
            return { history: [], data: [], trades: [] };
          })
        );

        const allResponses = await Promise.all(allHistoryPromises);

        // Combine all history records
        let combinedHistory: any[] = [];
        let combinedData: any[] = [];
        let combinedTrades: any[] = [];

        allResponses.forEach((response: any) => {
          if (Array.isArray(response.history)) {
            combinedHistory = [...combinedHistory, ...response.history];
          }
          if (Array.isArray(response.data)) {
            combinedData = [...combinedData, ...response.data];
          }
          if (Array.isArray(response.trades)) {
            combinedTrades = [...combinedTrades, ...response.trades];
          }
          if (Array.isArray(response)) {
            combinedHistory = [...combinedHistory, ...response];
          }
        });

        const combinedResponse = {
          ...allResponses[0],
          history: combinedHistory.length > 0 ? combinedHistory : undefined,
          data: combinedData.length > 0 ? combinedData : undefined,
          trades: combinedTrades.length > 0 ? combinedTrades : undefined,
        };

        // Cache successful response
        await this.cacheService.set(cacheKey, combinedResponse);
        this.logger.debug(`Combined history from ${exnessAccountIds.length} EXNESS accounts`);
        return combinedResponse;
      }

      // Original flow: get history for specific account
      const response = await this.makeAuthenticatedRequest(
        'get-history.json',
        resolvedSession,
        { id: accountId },
      );

      if (response.error) {
        const errorMessage = response.message || 'Failed to fetch history';
        throw new HttpException(
          `Failed to fetch history: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Cache successful response
      await this.cacheService.set(cacheKey, response);
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
    session: string | undefined,
    accountId: string,
  ): Promise<{
    averageTradeLengthMs: number;
    averageTradeLengthFormatted: string;
    totalTrades: number;
  }> {
    try {
      const resolvedSession = await this.resolveSession(session);

      this.validateAccountId(accountId);

      const cacheKey = this.cacheService.generateKey('myfxbook:trade-length', resolvedSession, accountId);
      const cached = await this.cacheService.get<{
        averageTradeLengthMs: number;
        averageTradeLengthFormatted: string;
        totalTrades: number;
      }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for getAverageTradeLength');
        return cached;
      }

      // getHistory already handles "default" accountId by combining histories
      const historyResponse = await this.getHistory(resolvedSession, accountId);

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

      const result = {
        averageTradeLengthMs: Math.round(averageTradeLengthMs),
        averageTradeLengthFormatted: this.formatDuration(averageTradeLengthMs),
        totalTrades: records.length,
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;
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
    session: string | undefined,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    profitabilityPercent: number;
    drawdownPercent: number;
  }> {
    try {
      const resolvedSession = await this.resolveSession(session);

      this.validateAccountId(accountId);

      if (!startDate || !endDate) {
        throw new HttpException(
          'Start date and end date are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const cacheKey = this.cacheService.generateKey('myfxbook:profitability', resolvedSession, accountId, startDate, endDate);
      const cached = await this.cacheService.get<{
        profitabilityPercent: number;
        drawdownPercent: number;
      }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for getBalanceProfitability');
        return cached;
      }

      const dataDaily = await this.getDataDaily(
        resolvedSession,
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
          profitabilityPercent: 0,
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

      const result = {
        profitabilityPercent: Number((profitability * 100).toFixed(2)),
        drawdownPercent: Number((drawdown * 100).toFixed(2)),
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;
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
    session: string | undefined,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      const resolvedSession = await this.resolveSession(session);
      this.validateAccountId(accountId);

      // Endpoint-based cache key
      const cacheKey = this.cacheService.generateKey('endpoint:get-data-daily', accountId, startDate, endDate);
      const cached = await this.cacheService.get<any>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for endpoint:get-data-daily');
        return cached;
      }

      // Handle "default" accountId - combine daily data from all EXNESS accounts
      if (this.isDefaultAccount(accountId)) {
        const exnessAccountIds = this.getExnessAccountIds();
        const params: Record<string, any> = {
          start: startDate,
          end: endDate,
        };

        const allDailyPromises = exnessAccountIds.map(id =>
          this.makeAuthenticatedRequest(
            'get-data-daily.json',
            resolvedSession,
            { ...params, id },
          ).catch(err => {
            this.logger.warn(`Failed to fetch daily data for account ${id}: ${err.message}`);
            return { dataDaily: [], data: [], records: [], error: false };
          })
        );

        const allResponses: any[] = await Promise.all(allDailyPromises);

        // Combine all daily records
        let combinedDataDaily: any[] = [];
        let totalProfit = 0;

        allResponses.forEach((response: any) => {
          if (Array.isArray(response.dataDaily)) {
            combinedDataDaily = [...combinedDataDaily, ...response.dataDaily];
          } else if (Array.isArray(response.data)) {
            combinedDataDaily = [...combinedDataDaily, ...response.data];
          } else if (Array.isArray(response.records)) {
            combinedDataDaily = [...combinedDataDaily, ...response.records];
          }

          // Sum total profit if available
          if (response.totalProfit !== undefined) {
            totalProfit += Number(response.totalProfit) || 0;
          }
        });

        // Calculate total profit from all records
        if (combinedDataDaily.length > 0) {
          combinedDataDaily.forEach((recordArr: any) => {
            const record = Array.isArray(recordArr) ? recordArr[0] : recordArr;
            if (record && (record.profit !== undefined || record.profite !== undefined)) {
              totalProfit += Number(record.profit ?? record.profite ?? 0) || 0;
            }
          });
        }

        const combinedResponse = {
          ...allResponses[0],
          dataDaily: combinedDataDaily,
          totalProfit: Number(totalProfit.toFixed(2)),
          error: false,
        };

        // Cache successful response
        await this.cacheService.set(cacheKey, combinedResponse);
        this.logger.debug(`Combined daily data from ${exnessAccountIds.length} EXNESS accounts`);
        return combinedResponse;
      }

      // Original flow: get daily data for specific account
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
        resolvedSession,
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
      const result = {
        ...response,
        totalProfit: Number(totalProfit.toFixed(2)),
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;
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
    session: string | undefined,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ gain: number; startDate: string; endDate: string }> {
    try {
      const resolvedSession = await this.resolveSession(session);
      const cacheKey = this.cacheService.generateKey('myfxbook:gain', resolvedSession, accountId, startDate, endDate);
      const cached = await this.cacheService.get<{ gain: number; startDate: string; endDate: string }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for getGainForPeriod');
        return cached;
      }

      // Handle "default" accountId - sum gains from all EXNESS accounts
      if (this.isDefaultAccount(accountId)) {
        const exnessAccountIds = this.getExnessAccountIds();
        const params: Record<string, any> = {
          start: startDate,
          end: endDate,
        };

        const allGainPromises = exnessAccountIds.map(id =>
          this.makeAuthenticatedRequest(
            'get-gain.json',
            resolvedSession,
            { ...params, id },
          ).catch(err => {
            this.logger.warn(`Failed to fetch gain for account ${id}: ${err.message}`);
            return { error: false, gain: 0 };
          })
        );

        const allResponses = await Promise.all(allGainPromises);

        // Sum gains from all accounts
        let totalGain = 0;
        allResponses.forEach(response => {
          if (!response.error) {
            const gain = this.extractGainValue(response);
            totalGain += gain;
          }
        });

        const result = { gain: totalGain, startDate, endDate };

        // Cache successful response
        await this.cacheService.set(cacheKey, result);
        this.logger.debug(`Combined gain from ${exnessAccountIds.length} EXNESS accounts`);
        return result;
      }

      // Original flow: get gain for specific account
      const params: Record<string, any> = {
        id: accountId,
        start: startDate,
        end: endDate,
      };

      const response = await this.makeAuthenticatedRequest(
        'get-gain.json',
        resolvedSession,
        params,
      );

      if (response.error) {
        this.logger.warn(
          `Failed to fetch gain for ${startDate} to ${endDate}: ${response.message}`,
        );
        return { gain: 0, startDate, endDate };
      }

      const gain = this.extractGainValue(response);
      const result = { gain, startDate, endDate };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;
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
    session: string | undefined,
    accountId: string,
  ): Promise<{
    today: {
      differencePercent: number;
    };
    thisWeek: {
      differencePercent: number;
    };
    thisMonth: {
      differencePercent: number;
    };
    thisYear: {
      differencePercent: number;
    };
  }> {
    try {
      const resolvedSession = await this.resolveSession(session);
      this.validateAccountId(accountId);

      const cacheKey = this.cacheService.generateKey('myfxbook:gain-comparisons', resolvedSession, accountId);
      const cached = await this.cacheService.get<{
        today: { differencePercent: number };
        thisWeek: { differencePercent: number };
        thisMonth: { differencePercent: number };
        thisYear: { differencePercent: number };
      }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for getGainComparisons');
        return cached;
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
        this.getGainForPeriod(resolvedSession, accountId, todayStr, todayStr),
        this.getGainForPeriod(resolvedSession, accountId, yesterdayStr, yesterdayStr),
      ]);

      // This week vs Previous week
      const thisWeekStart = this.getStartOfWeek(today);
      const thisWeekEnd = new Date(today);
      const previousWeekEnd = new Date(thisWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
      const previousWeekStart = this.getStartOfWeek(previousWeekEnd);

      const [thisWeekGain, previousWeekGain] = await Promise.all([
        this.getGainForPeriod(
          resolvedSession,
          accountId,
          this.formatDate(thisWeekStart),
          this.formatDate(thisWeekEnd),
        ),
        this.getGainForPeriod(
          resolvedSession,
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
          resolvedSession,
          accountId,
          this.formatDate(thisMonthStart),
          this.formatDate(thisMonthEnd),
        ),
        this.getGainForPeriod(
          resolvedSession,
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
          resolvedSession,
          accountId,
          this.formatDate(thisYearStart),
          this.formatDate(thisYearEnd),
        ),
        this.getGainForPeriod(
          resolvedSession,
          accountId,
          this.formatDate(previousYearStart),
          this.formatDate(previousYearEnd),
        ),
      ]);

      const todayDiff = calculateDifference(todayGain, yesterdayGain);
      const weekDiff = calculateDifference(thisWeekGain, previousWeekGain);
      const monthDiff = calculateDifference(thisMonthGain, previousMonthGain);
      const yearDiff = calculateDifference(thisYearGain, previousYearGain);

      const result = {
        today: {
          ...todayDiff,
        },
        thisWeek: {
          ...weekDiff,
        },
        thisMonth: {
          ...monthDiff,
        },
        thisYear: {
          ...yearDiff,
        },
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;
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

  /**
   * Extract profit and pips from get-data-daily response
   */
  private extractProfitAndPips(response: any): {
    totalProfit: number;
    totalPips: number;
  } {
    let totalProfit = 0;
    let totalPips = 0;

    // Try to find records in different possible locations
    let records: any[] = [];

    if (Array.isArray((response as any).dataDaily)) {
      records = (response as any).dataDaily;
    } else if (Array.isArray((response as any).data)) {
      records = (response as any).data;
    } else if (Array.isArray((response as any).records)) {
      records = (response as any).records;
    } else if (Array.isArray(response)) {
      records = response as any[];
    }

    // Sum up all profit and pips values from records
    if (Array.isArray(records) && records.length > 0) {
      records.forEach((recordArr: any) => {
        const record = Array.isArray(recordArr) ? recordArr[0] : recordArr;

        if (!record) return;

        // Extract profit
        const profitValue =
          record.profit !== undefined
            ? record.profit
            : record.profite !== undefined
              ? record.profite
              : null;

        if (profitValue !== undefined && profitValue !== null) {
          totalProfit += Number(profitValue) || 0;
        }

        // Extract pips
        const pipsValue =
          record.pips !== undefined
            ? record.pips
            : record.pip !== undefined
              ? record.pip
              : null;

        if (pipsValue !== undefined && pipsValue !== null) {
          totalPips += Number(pipsValue) || 0;
        }
      });
    }

    return {
      totalProfit: Number(totalProfit.toFixed(2)),
      totalPips: Number(totalPips.toFixed(2)),
    };
  }

  /**
   * Get daily data comparisons for multiple periods (today/yesterday, this week/previous week, etc.)
   * @param session - Session token
   * @param accountId - Account ID
   * @returns Daily data comparison for all periods with profit and pips sums
   */
  async getDailyDataComparisons(
    session: string | undefined,
    accountId: string,
  ) {
    try {
      const resolvedSession = await this.resolveSession(session);
      const decoded = validateAndDecodeSession(resolvedSession)
      this.validateAccountId(accountId);

      const cacheKey = this.cacheService.generateKey('myfxbook:daily-comparisons', resolvedSession, accountId);
      const cached = await this.cacheService.get<any>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for getDailyDataComparisons');
        return cached;
      }

      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));

      // Generic function for comparing two periods
      const comparePeriods = async (startA: any, endA: any, startB: any, endB: any) => {
        const [dataA, dataB] = await Promise.all([
          this.getDataDaily(resolvedSession, accountId, this.formatDate(startA), this.formatDate(endA)),
          this.getDataDaily(resolvedSession, accountId, this.formatDate(startB), this.formatDate(endB)),
        ]);

        return calculateDifferences(
          this.extractProfitAndPips(dataA),
          this.extractProfitAndPips(dataB),
        );
      };

      // Today vs Yesterday
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const todayDiff = await comparePeriods(today, today, yesterday, yesterday);

      // Week comparison
      const thisWeekStart = this.getStartOfWeek(today);
      const thisWeekEnd = today;
      const prevWeekEnd = new Date(thisWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      const prevWeekStart = this.getStartOfWeek(prevWeekEnd);
      const weekDiff = await comparePeriods(thisWeekStart, thisWeekEnd, prevWeekStart, prevWeekEnd);

      // Month comparison
      const thisMonthStart = this.getStartOfMonth(today);
      const thisMonthEnd = today;
      const prevMonthEnd = new Date(thisMonthStart);
      prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);
      const prevMonthStart = this.getStartOfMonth(prevMonthEnd);
      const monthDiff = await comparePeriods(thisMonthStart, thisMonthEnd, prevMonthStart, prevMonthEnd);

      // Year comparison
      const thisYearStart = this.getStartOfYear(today);
      const thisYearEnd = today;
      const prevYearEnd = new Date(thisYearStart);
      prevYearEnd.setDate(prevYearEnd.getDate() - 1);
      const prevYearStart = this.getStartOfYear(prevYearEnd);
      const yearDiff = await comparePeriods(thisYearStart, thisYearEnd, prevYearStart, prevYearEnd);

      const result = {
        today: todayDiff,
        thisWeek: weekDiff,
        thisMonth: monthDiff,
        thisYear: yearDiff,
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;

    } catch (error) {
      throw new HttpException(
        `Failed to get daily data comparisons: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  async getAllComparisons(session: string | undefined, accountId: string) {
    try {
      const resolvedSession = await this.resolveSession(session);
      this.validateAccountId(accountId);

      // Endpoint-based cache key
      const cacheKey = this.cacheService.generateKey('endpoint:get-data-comparisons', accountId);
      const cached = await this.cacheService.get<any>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for endpoint:get-data-comparisons');
        return cached;
      }

      const [gain, daily] = await Promise.all([
        this.getGainComparisons(resolvedSession, accountId),
        this.getDailyDataComparisons(resolvedSession, accountId),
      ]);

      const result = {
        gainComparisons: gain,
        dailyDataComparisons: daily,
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;

    } catch (error) {
      throw new HttpException(
        `Failed to get combined comparisons: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get balance profitability and average trade length together
   * @param session - Session token (optional, resolved automatically)
   * @param accountId - Account ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getPerformanceSummary(
    session: string | undefined,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    balanceProfitability: {
      profitabilityPercent: number;
      drawdownPercent: number;
    };
    averageTradeLength: {
      averageTradeLengthMs: number;
      averageTradeLengthFormatted: string;
      totalTrades: number;
    };
  }> {
    try {
      const resolvedSession = await this.resolveSession(session);
      this.validateAccountId(accountId);

      // Endpoint-based cache key
      const cacheKey = this.cacheService.generateKey('endpoint:get-performance-summary', accountId, startDate, endDate);
      const cached = await this.cacheService.get<{
        balanceProfitability: any;
        averageTradeLength: any;
      }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache hit for endpoint:get-performance-summary');
        return cached;
      }

      const [balanceProfitability, averageTradeLength] = await Promise.all([
        this.getBalanceProfitability(resolvedSession, accountId, startDate, endDate),
        this.getAverageTradeLength(resolvedSession, accountId),
      ]);

      const result = {
        balanceProfitability,
        averageTradeLength,
      };

      // Cache successful response
      await this.cacheService.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get performance summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}

