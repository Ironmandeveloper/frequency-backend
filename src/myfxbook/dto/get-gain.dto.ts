import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetGainDto {
  @ApiProperty({
    description: 'Myfxbook session token',
    example: 'DSL07vu14QxHWErTIAFrH40',
  })
  @IsString()
  @IsNotEmpty()
  session: string;

  @ApiProperty({
    description: 'Account ID',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Start date (YYYY-MM-DD format)',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsNotEmpty()
  start: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD format)',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsNotEmpty()
  end: string;
}

export class GetGainQueryDto {
  @ApiProperty({
    description: 'Account ID',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Start date (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  start?: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD format)',
    example: '2024-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  end?: string;
}

