import { ApiProperty } from '@nestjs/swagger';

export class BalanceProfitabilityDto {
  @ApiProperty({
    description: 'Balance at the start date',
    example: 10000.5,
  })
  startBalance: number;

  @ApiProperty({
    description: 'Balance at the end date',
    example: 10500.75,
  })
  endBalance: number;

  @ApiProperty({
    description:
      'Profitability ratio between start and end date ((end-start)/start)',
    example: 0.05,
  })
  profitability: number;

  @ApiProperty({
    description: 'Profitability expressed as a percentage',
    example: 5.0,
  })
  profitabilityPercent: number;

  @ApiProperty({
    description: 'Peak balance (highest balance in the period)',
    example: 11000.0,
  })
  peakBalance: number;

  @ApiProperty({
    description: 'Trough balance (lowest balance after peak, before recovery)',
    example: 10000.0,
  })
  troughBalance: number;

  @ApiProperty({
    description: 'Drawdown ratio ((peak - trough) / peak)',
    example: 0.0909,
  })
  drawdown: number;

  @ApiProperty({
    description: 'Drawdown expressed as a percentage',
    example: 9.09,
  })
  drawdownPercent: number;
}

