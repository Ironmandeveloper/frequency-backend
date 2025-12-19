import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MyfxbookService } from './myfxbook.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class MyfxbookCronService {
  private readonly logger = new Logger(MyfxbookCronService.name);
  private readonly defaultCacheKey = 'myfxbook:default-trade-lengths';

  constructor(
    private readonly myfxbookService: MyfxbookService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Cron job that runs every 10 minutes to fetch all accounts' trade lengths
   * and cache the aggregated result for "default" account requests
   */
  @Cron('*/10 * * * *') // Every 10 minutes
  async handleDefaultTradeLengthsCron() {
    this.logger.log('Starting cron job to fetch default trade lengths for all accounts...');
    
    try {
      // Get all accounts from the API
      const accountsResponse = await this.myfxbookService.getMyAccounts();
      const accounts = Array.isArray(accountsResponse) ? accountsResponse : [];
      
      // Filter out the default account and get real account IDs
      const accountIds = accounts
        .filter((acc: any) => acc.id && acc.id !== 'default')
        .map((acc: any) => String(acc.id));
      
      if (accountIds.length === 0) {
        this.logger.warn('No accounts found to process');
        return;
      }
      console.log("accountIds",accountIds)
      this.logger.log(`Processing ${accountIds.length} accounts for default trade lengths`);

      // Fetch trade lengths for all accounts
      const tradeLengthPromises = accountIds.map(async (accountId) => {
        try {
          const result = await this.myfxbookService.getAverageTradeLength(
            undefined,
            accountId,
          );
          console.log("cron service result",result)
          return {
            accountId,
            ...result,
          };
        } catch (error) {
          this.logger.warn(`Failed to fetch trade length for account ${accountId}: ${error.message}`);
          return {
            accountId,
            averageTradeLengthMs: 0,
            averageTradeLengthFormatted: '0s',
            totalTrades: 0,
          };
        }
      });

      const allTradeLengths = await Promise.all(tradeLengthPromises);

      // Calculate aggregated values
      let totalTradeLengthMs = 0;
      let totalTrades = 0;
      let validAccounts = 0;

      allTradeLengths.forEach((accountData) => {
        if (accountData.totalTrades > 0) {
          // Sum: total trade length = average * number of trades for each account
          const accountTotalMs = accountData.averageTradeLengthMs * accountData.totalTrades;
          totalTradeLengthMs += accountTotalMs;
          totalTrades += accountData.totalTrades;
          validAccounts++;
        }
      });

      // Calculate overall average trade length
      const averageTradeLengthMs = totalTrades > 0 
        ? Math.round(totalTradeLengthMs / totalTrades) 
        : 0;

      // Format the duration
      const averageTradeLengthFormatted = this.formatDuration(averageTradeLengthMs);

      const aggregatedResult = {
        averageTradeLengthMs,
        averageTradeLengthFormatted,
        totalTrades,
        accountDetails: allTradeLengths,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result with 10 minutes TTL (600 seconds)
      // This ensures the cache lasts until the next cron run
      await this.cacheService.set(this.defaultCacheKey, aggregatedResult, 600);
      
      this.logger.log(
        `Successfully cached default trade lengths: ${totalTrades} total trades, ` +
        `average: ${averageTradeLengthFormatted}`
      );
    } catch (error) {
      this.logger.error(
        `Error in default trade lengths cron job: ${error.message}`,
        error.stack,
      );
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
   * Get cached default trade lengths
   * @returns Cached trade lengths or null if not found
   */
  async getCachedDefaultTradeLengths(): Promise<{
    averageTradeLengthMs: number;
    averageTradeLengthFormatted: string;
    totalTrades: number;
  } | null> {
    return await this.cacheService.get(this.defaultCacheKey);
  }
}

