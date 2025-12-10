import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  HttpException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { MyfxbookService } from './myfxbook.service';
import { BaseResponseDto } from '../common/dto/base-response.dto';
import { AggregatedAccountsDto } from './dto/aggregated-accounts.dto';
import { TradeLengthDto } from './dto/trade-length.dto';
import { BalanceProfitabilityDto } from './dto/balance-profitability.dto';
import { GainComparisonDto } from './dto/gain-comparison.dto';
import { DailyDataComparisonDto } from './dto/daily-data-comparison.dto';

@ApiTags('Myfxbook')
@Controller('myfxbook')
export class MyfxbookController {
  constructor(private readonly myfxbookService: MyfxbookService) { }

  @Get('get-my-accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all trading accounts (session handled automatically)',
    description:
      'Retrieves all trading accounts. Session is managed automatically via backend cache; clients do not need to provide it.',
  })
  async getMyAccounts(
  ): Promise<BaseResponseDto<any>> {
    try {
      const accounts = await this.myfxbookService.getMyAccounts();

      return new BaseResponseDto(
        true,
        accounts,
        'Accounts retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch accounts',
      };
      return new BaseResponseDto(false, errorData, 'Failed to fetch accounts');
    }
  }

  @Get('get-aggregated-accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get total balance, total profit, average monthly return',
    description:
      'Retrieves aggregated statistics; session is managed automatically via backend cache.',
  })
  async getAggregatedAccounts(
  ): Promise<BaseResponseDto<AggregatedAccountsDto | any>> {
    try {
      const aggregatedData =
        await this.myfxbookService.getAggregatedAccounts();

      return new BaseResponseDto(
        true,
        aggregatedData,
        'Aggregated accounts data retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch aggregated accounts',
      };
      return new BaseResponseDto(
        false,
        errorData,
        'Failed to fetch aggregated accounts',
      );
    }
  }


  @Get('get-average-trade-length')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get average trade length from history and total trades',
    description:
      'Calculates the average trade length. Session is handled automatically; client does not need to pass it.',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'Account ID from Myfxbook',
    type: String,
    example: '12345',
    schema: { type: 'string', minLength: 1 },
  })
  async getAverageTradeLength(
    @Query('id') accountId: string,
  ): Promise<BaseResponseDto<TradeLengthDto | any>> {
    try {
      const tradeLengthData =
        await this.myfxbookService.getAverageTradeLength(undefined, accountId);

      return new BaseResponseDto(
        true,
        tradeLengthData,
        'Average trade length calculated successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to calculate average trade length',
      };
      return new BaseResponseDto(
        false,
        errorData,
        'Failed to calculate average trade length',
      );
    }
  }

  @Get('get-balance-profitability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get balance profitability and drawdown between start and end dates',
    description:
      'Calculates profitability and drawdown using daily data. Session is handled automatically; client does not need to pass it.',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'Account ID from Myfxbook',
    type: String,
    example: '12345',
    schema: { type: 'string', minLength: 1 },
  })
  @ApiQuery({
    name: 'start',
    required: true,
    description: 'Start date in format YYYY-MM-DD',
    type: String,
    example: '2024-01-01',
    schema: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  })
  @ApiQuery({
    name: 'end',
    required: true,
    description: 'End date in format YYYY-MM-DD',
    type: String,
    example: '2024-12-31',
    schema: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  })
  async getBalanceProfitability(
    @Query('id') accountId: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<BaseResponseDto<BalanceProfitabilityDto | any>> {
    try {

      const profitability =
        await this.myfxbookService.getBalanceProfitability(
          undefined,
          accountId,
          startDate,
          endDate,
        );

      return new BaseResponseDto(
        true,
        profitability,
        'Balance profitability calculated successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to calculate balance profitability',
      };
      return new BaseResponseDto(
        false,
        errorData,
        'Failed to calculate balance profitability',
      );
    }
  }

  @Get('get-data-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily data for a risk account and total profit for chart on the base of start date and end date',
    description:
      'Retrieves daily data for a specific account between the specified date range. Session is handled automatically; client does not need to pass it.',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'Account ID from Myfxbook',
    type: String,
    example: '12345',
    schema: { type: 'string', minLength: 1 },
  })
  @ApiQuery({
    name: 'start',
    required: true,
    description: 'Start date in format YYYY-MM-DD',
    type: String,
    example: '2000-01-01',
    schema: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  })
  @ApiQuery({
    name: 'end',
    required: true,
    description: 'End date in format YYYY-MM-DD',
    type: String,
    example: '2010-01-01',
    schema: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  })
  async getDataDaily(
    @Query('id') accountId: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<BaseResponseDto<any>> {
    try {

      const dataDailyData = await this.myfxbookService.getDataDaily(
        undefined,
        accountId,
        startDate,
        endDate,
      );
      return new BaseResponseDto(
        true,
        dataDailyData,
        'Daily data retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch daily data',
      };
      return new BaseResponseDto(false, errorData, 'Failed to fetch daily data');
    }
  }

  @Get('get-gain-comparisons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get gain comparisons for today, this week, this month, this year on the base of risk account and myFx session',
    description:
      'Retrieves gain data and comparisons (today/week/month/year). Session is handled automatically; client does not need to pass it.',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'Account ID from Myfxbook',
    type: String,
    example: '12345',
    schema: { type: 'string', minLength: 1 },
  })
  async getGainComparisons(
    @Query('id') accountId: string,
  ): Promise<BaseResponseDto<GainComparisonDto | any>> {
    try {

      const gainComparisons =
        await this.myfxbookService.getGainComparisons(undefined, accountId);

      return new BaseResponseDto(
        true,
        gainComparisons,
        'Gain comparisons retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch gain comparisons',
      };
      return new BaseResponseDto(
        false,
        errorData,
        'Failed to fetch gain comparisons',
      );
    }
  }

  @Get('get-daily-data-comparisons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get profite difference and pips difference on today, this week, this month, and this year base on risk account and myfx session',
    description:
      'Retrieves daily data (profit and pips) comparisons across periods. Session is handled automatically; client does not need to pass it.',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'Account ID from Myfxbook',
    type: String,
    example: '12345',
    schema: { type: 'string', minLength: 1 },
  })
  async getDailyDataComparisons(
    @Query('id') accountId: string,
  ): Promise<BaseResponseDto<DailyDataComparisonDto | any>> {
    try {
      const dailyDataComparisons =
        await this.myfxbookService.getDailyDataComparisons(undefined, accountId);

      return new BaseResponseDto(
        true,
        dailyDataComparisons,
        'Daily data comparisons retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch daily data comparisons',
      };
      return new BaseResponseDto(
        false,
        errorData,
        'Failed to fetch daily data comparisons',
      );
    }
  }
}

