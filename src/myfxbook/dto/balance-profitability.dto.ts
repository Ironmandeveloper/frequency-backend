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
}

