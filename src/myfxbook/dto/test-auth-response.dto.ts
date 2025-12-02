import { ApiProperty } from '@nestjs/swagger';

export class TestAuthResponseDto {
  @ApiProperty({
    description: 'Whether the authentication was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Session token from Myfxbook API (if authentication successful)',
    example: 'abc123xyz789',
    required: false,
  })
  session?: string;

  @ApiProperty({
    description: 'Authentication result message',
    example: 'Myfxbook authentication successful',
  })
  message: string;
}

