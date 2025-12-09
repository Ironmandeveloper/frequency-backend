import { ApiProperty } from '@nestjs/swagger';

export class AggregatedAccountsDto {
  @ApiProperty({
    description: 'Total sum of all account balances',
    example: 50000.00,
  })
  totalBalance: number;

  @ApiProperty({
    description: 'Total sum of all account profits',
    example: 12500.00,
  })
  totalProfit: number;

  @ApiProperty({
    description: 'Average monthly gain percentage across all accounts',
    example: 25.50,
  })
  averageMonthlyGain: number;

  @ApiProperty({
    description: 'Total number of accounts',
    example: 5,
  })
  totalAccounts: number;
}

