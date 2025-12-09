import { ApiProperty } from '@nestjs/swagger';

export class TradeLengthDto {
  @ApiProperty({
    description: 'Average trade length in milliseconds',
    example: 3600000,
  })
  averageTradeLengthMs: number;

  @ApiProperty({
    description: 'Average trade length in a human-readable format (hours, minutes, seconds)',
    example: '1h 0m 0s',
  })
  averageTradeLengthFormatted: string;

  @ApiProperty({
    description: 'Total number of trades in the history',
    example: 150,
  })
  totalTrades: number;
}

