import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { MyfxbookService } from './myfxbook.service';
import { LoginDto } from './dto/login.dto';
import { BaseResponseDto } from '../common/dto/base-response.dto';
import { TestAuthResponseDto } from './dto/test-auth-response.dto';

@ApiTags('Myfxbook')
@Controller('myfxbook')
export class MyfxbookController {
  constructor(private readonly myfxbookService: MyfxbookService) { }

  @Get('test-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test Myfxbook authentication',
    description:
      'Tests Myfxbook authentication using credentials from environment variables (MYFXBOOK_EMAIL and MYFXBOOK_PASSWORD). Returns session token if successful.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication test completed',
    type: BaseResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Authentication test passed',
        data: {
          success: true,
          session: 'abc123xyz789',
          message: 'Myfxbook authentication successful',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing credentials in environment variables',
    schema: {
      example: {
        success: false,
        message: 'Authentication test failed',
        data: {
          success: false,
          message:
            'Myfxbook credentials are required. Please set MYFXBOOK_EMAIL and MYFXBOOK_PASSWORD in your .env file or provide them in the request.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication failed - invalid credentials',
    schema: {
      example: {
        success: false,
        message: 'Authentication test failed',
        data: {
          success: false,
          message: 'Myfxbook authentication failed: Invalid credentials',
        },
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: BaseResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          success: true,
          session: 'abc123xyz789',
          message: 'Myfxbook authentication successful',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or missing credentials',
    schema: {
      example: {
        success: false,
        message: 'Login failed',
        data: {
          success: false,
          message:
            'Myfxbook credentials are required. Please set MYFXBOOK_EMAIL and MYFXBOOK_PASSWORD in your .env file or provide them in the request.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication failed - invalid credentials',
    schema: {
      example: {
        success: false,
        message: 'Login failed',
        data: {
          success: false,
          message: 'Myfxbook authentication failed: Invalid credentials',
        },
      },
    },
  })
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
}

