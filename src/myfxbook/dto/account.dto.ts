import { ApiProperty } from '@nestjs/swagger';

export class AccountDto {
  @ApiProperty({
    description: 'Account ID',
    example: 12345,
  })
  id?: number;

  @ApiProperty({
    description: 'Account name',
    example: 'My Trading Account',
  })
  name?: string;

  @ApiProperty({
    description: 'Account broker',
    example: 'OANDA',
  })
  broker?: string;

  @ApiProperty({
    description: 'Account currency',
    example: 'USD',
  })
  currency?: string;

  @ApiProperty({
    description: 'Account balance',
    example: 10000.00,
  })
  balance?: number;

  @ApiProperty({
    description: 'Account equity',
    example: 10500.00,
  })
  equity?: number;

  @ApiProperty({
    description: 'Account gain percentage',
    example: 25.50,
  })
  gain?: number;

  @ApiProperty({
    description: 'Account profit',
    example: 2550.00,
  })
  profit?: number;

  @ApiProperty({
    description: 'Account drawdown',
    example: 5.2,
  })
  drawdown?: number;

  @ApiProperty({
    description: 'Total trades',
    example: 150,
  })
  totalTrades?: number;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01',
  })
  creationDate?: string;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-12-01',
  })
  lastUpdateDate?: string;

  @ApiProperty({
    description: 'Is account active',
    example: true,
  })
  isActive?: boolean;
}

export class GetMyAccountsResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: false,
  })
  error: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Success',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Array of user accounts',
    type: [AccountDto],
    required: false,
  })
  accounts?: AccountDto[];
}

