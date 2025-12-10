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

@ApiTags('Myfxbook')
@Controller('myfxbook')
export class MyfxbookController {
  constructor(private readonly myfxbookService: MyfxbookService) { }

  @Get('get-my-accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all risks accounts for drowndown options ',
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
    summary: 'Get total balance, total profit, average monthly return on the base my myfx session',
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


  @Get('get-performance-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get balance profitability, total trades, drawdon and average trade length together of the specific risk account',
    description:
      'Returns both balance profitability (with drawdown) and average trade length in one call. Session is handled automatically; client only provides accountId, start, end.',
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
  async getPerformanceSummary(
    @Query('id') accountId: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<BaseResponseDto<any>> {
    try {
      const data = await this.myfxbookService.getPerformanceSummary(
        undefined,
        accountId,
        startDate,
        endDate,
      );

      return new BaseResponseDto(
        true,
        data,
        'Performance summary retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch performance summary',
      };
      return new BaseResponseDto(
        false,
        errorData,
        'Failed to fetch performance summary',
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


  @Get('get-data-comparisons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get gain, profit difference, pips differencs on the base of today, this weeek, this month and this year',
    description:
      'Get gain, profit difference, pips differencs on the base of today, this weeek, this month and this year',
  })
  async getAll(
    @Query('accountId') accountId?: string,
  ) {
    if (!accountId) {
      throw new HttpException('accountId is required', HttpStatus.BAD_REQUEST);
    }

    return this.myfxbookService.getAllComparisons(undefined, accountId);
  }
}

