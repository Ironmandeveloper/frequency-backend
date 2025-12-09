import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { MyfxbookService } from './myfxbook.service';
import { LoginDto } from './dto/login.dto';
import { BaseResponseDto } from '../common/dto/base-response.dto';
import { TestAuthResponseDto } from './dto/test-auth-response.dto';
import { AggregatedAccountsDto } from './dto/aggregated-accounts.dto';
import { validateAndDecodeSession } from '../common/utils/session.utils';

@ApiTags('Myfxbook')
@Controller('myfxbook')
export class MyfxbookController {
  constructor(private readonly myfxbookService: MyfxbookService) { }

  @Get('test-auth')
  @HttpCode(HttpStatus.OK)
  async testAuthentication(): Promise<
    BaseResponseDto<TestAuthResponseDto>
  > {
    const result = await this.myfxbookService.testAuthentication();
    return new BaseResponseDto(
      result.success,
      result,
      result.success ? 'Authentication test passed' : 'Authentication test failed',
    );
  }


  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login to Myfxbook API',
    description:
      'Authenticates with Myfxbook API and returns a session token. Uses provided credentials or falls back to environment variables.',
  })
  @ApiBody({ type: LoginDto, required: false })
  async login(
    @Body() loginDto?: LoginDto,
  ): Promise<BaseResponseDto<TestAuthResponseDto>> {
    try {
      const session = await this.myfxbookService.login(loginDto);
      if (!session) {
        const result: TestAuthResponseDto = {
          success: false,
          message: 'Myfxbook authentication failed: No session token received',
        };
        return new BaseResponseDto(false, result, 'Login failed');
      }

      const result: TestAuthResponseDto = {
        success: true,
        session,
        message: 'Myfxbook authentication successful',
      };
      return new BaseResponseDto(true, result, 'Login successful');
    } catch (error) {
      const result: TestAuthResponseDto = {
        success: false,
        message:
          error instanceof HttpException
            ? error.message
            : 'Login failed',
      };
      return new BaseResponseDto(false, result, 'Login failed');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout from Myfxbook API',
    description:
      'Invalidates the current session token and logs out from Myfxbook API. The session token will no longer be valid after logout.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        session: {
          type: 'string',
          description: 'Session token to invalidate',
          example: 'DSL07vu14QxHWErTIAFrH40',
        },
      },
      required: ['session'],
    },
  })
  async logout(
    @Body('session') session: string,
  ): Promise<BaseResponseDto<any>> {
    try {
      const decoded = validateAndDecodeSession(session);
      const result = await this.myfxbookService.logout(decoded);

      return new BaseResponseDto(
        true,
        result,
        'Logout successful',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to logout',
      };
      return new BaseResponseDto(false, errorData, 'Logout failed');
    }
  }

  @Get('get-my-accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user Myfxbook accounts',
    description:
      'Retrieves all trading accounts associated with the authenticated user session. Requires a valid session token.',
  })
  @ApiQuery({
    name: 'session',
    required: true,
    description: 'Session token obtained from the login endpoint',
    type: String,
    example: 'DSL07vu14QxHWErTIAFrH40',
    schema: {
      type: 'string',
      minLength: 1,
    },
  })
  async getMyAccounts(
    @Query('session') session: string,
  ): Promise<BaseResponseDto<any>> {
    try {
      const decoded = validateAndDecodeSession(session);
      const accounts = await this.myfxbookService.getMyAccounts(decoded);

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
    summary: 'Get aggregated statistics for all accounts',
    description:
      'Retrieves aggregated statistics including total balance, total profit, and average monthly gain across all user accounts. Requires a valid session token.',
  })
  @ApiQuery({
    name: 'session',
    required: true,
    description: 'Session token obtained from the login endpoint',
    type: String,
    example: 'DSL07vu14QxHWErTIAFrH40',
    schema: {
      type: 'string',
      minLength: 1,
    },
  })
  async getAggregatedAccounts(
    @Query('session') session: string,
  ): Promise<BaseResponseDto<AggregatedAccountsDto | any>> {
    try {
      const decoded = validateAndDecodeSession(session);
      const aggregatedData =
        await this.myfxbookService.getAggregatedAccounts(decoded);

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

  @Get('get-gain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get gain data for a Myfxbook account',
    description:
      'Retrieves gain/performance data for a specific account between the specified date range. Requires session token, account ID, and date range.',
  })
  @ApiQuery({
    name: 'session',
    required: true,
    description: 'Session token obtained from the login endpoint',
    type: String,
    example: 'DSL07vu14QxHWErTIAFrH40',
    schema: { type: 'string', minLength: 1 },
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
  async getGain(
    @Query('session') session: string,
    @Query('id') accountId: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<BaseResponseDto<any>> {
    try {
      const decoded = validateAndDecodeSession(session);

      const gainData = await this.myfxbookService.getGain(
        decoded,
        accountId,
        startDate,
        endDate,
      );
      return new BaseResponseDto(
        true,
        gainData,
        'Gain data retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch gain data',
      };
      return new BaseResponseDto(false, errorData, 'Failed to fetch gain data');
    }
  }

  @Get('get-daily-gain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily gain data for a Myfxbook account',
    description:
      'Retrieves daily gain/performance data for a specific account between the specified date range. Requires session token, account ID, and date range.',
  })
  @ApiQuery({
    name: 'session',
    required: true,
    description: 'Session token obtained from the login endpoint',
    type: String,
    example: 'DSL07vu14QxHWErTIAFrH40',
    schema: { type: 'string', minLength: 1 },
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
    description: 'Start date in format YYYY-MM-DD (e.g., 2000-01-01)',
    type: String,
    example: '2000-01-01',
    schema: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  })
  @ApiQuery({
    name: 'end',
    required: true,
    description: 'End date in format YYYY-MM-DD (e.g., 2010-01-01)',
    type: String,
    example: '2010-01-01',
    schema: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  })
  async getDailyGain(
    @Query('session') session: string,
    @Query('id') accountId: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<BaseResponseDto<any>> {
    try {
      const decoded = validateAndDecodeSession(session);

      const dailyGainData = await this.myfxbookService.getDailyGain(
        decoded,
        accountId,
        startDate,
        endDate,
      );
      return new BaseResponseDto(
        true,
        dailyGainData,
        'Daily gain data retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch daily gain data',
      };
      return new BaseResponseDto(false, errorData, 'Failed to fetch daily gain data');
    }
  }

  @Get('get-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get trade history for a Myfxbook account',
    description:
      'Retrieves the complete trade history for a specific account. Requires session token and account ID.',
  })
  @ApiQuery({
    name: 'session',
    required: true,
    description: 'Session token obtained from the login endpoint',
    type: String,
    example: 'DSL07vu14QxHWErTIAFrH40',
    schema: { type: 'string', minLength: 1 },
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'Account ID from Myfxbook',
    type: String,
    example: '12345',
    schema: { type: 'string', minLength: 1 },
  })
  async getHistory(
    @Query('session') session: string,
    @Query('id') accountId: string,
  ): Promise<BaseResponseDto<any>> {
    try {
      const decoded = validateAndDecodeSession(session);

      const history = await this.myfxbookService.getHistory(
        decoded,
        accountId,
      );
      return new BaseResponseDto(
        true,
        history,
        'Trade history retrieved successfully',
      );
    } catch (error) {
      const errorData = {
        error: true,
        message:
          error instanceof HttpException
            ? error.message
            : 'Failed to fetch trade history',
      };
      return new BaseResponseDto(
        false,
        errorData,
        'Failed to fetch trade history',
      );
    }
  }

  @Get('get-data-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily data for a Myfxbook account',
    description:
      'Retrieves daily data for a specific account between the specified date range. This endpoint provides comprehensive daily statistics including balance, equity, and other account metrics.',
  })
  @ApiQuery({
    name: 'session',
    required: true,
    description: 'Session token obtained from the login endpoint',
    type: String,
    example: 'DSL07vu14QxHWErTIAFrH40',
    schema: { type: 'string', minLength: 1 },
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
    @Query('session') session: string,
    @Query('id') accountId: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ): Promise<BaseResponseDto<any>> {
    try {
      const decoded = validateAndDecodeSession(session);

      const dataDailyData = await this.myfxbookService.getDataDaily(
        decoded,
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
}

