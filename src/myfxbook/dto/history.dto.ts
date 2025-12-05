import { ApiProperty } from '@nestjs/swagger';

export class TradeHistoryDto {
  @ApiProperty({
    description: 'Trade ID',
    example: 123456789,
  })
  id?: number;

  @ApiProperty({
    description: 'Order ID',
    example: 987654321,
  })
  orderId?: number;

  @ApiProperty({
    description: 'Trade action (buy/sell)',
    example: 'buy',
  })
  action?: string;

  @ApiProperty({
    description: 'Trading symbol/pair',
    example: 'EURUSD',
  })
  symbol?: string;

  @ApiProperty({
    description: 'Lot size',
    example: 0.1,
  })
  lots?: number;

  @ApiProperty({
    description: 'Opening price',
    example: 1.1850,
  })
  openPrice?: number;

  @ApiProperty({
    description: 'Closing price',
    example: 1.1900,
  })
  closePrice?: number;

  @ApiProperty({
    description: 'Opening time',
    example: '2024-01-01 10:00:00',
  })
  openTime?: string;

  @ApiProperty({
    description: 'Closing time',
    example: '2024-01-01 15:00:00',
  })
  closeTime?: string;

  @ApiProperty({
    description: 'Trade profit/loss',
    example: 50.00,
  })
  profit?: number;

  @ApiProperty({
    description: 'Profit in pips',
    example: 50,
  })
  pips?: number;

  @ApiProperty({
    description: 'Trade comment',
    example: 'Trade comment',
  })
  comment?: string;

  @ApiProperty({
    description: 'Commission charged',
    example: 0.50,
  })
  commission?: number;

  @ApiProperty({
    description: 'Swap/Rollover',
    example: -0.25,
  })
  swap?: number;

  @ApiProperty({
    description: 'Stop Loss level',
    example: 1.1800,
  })
  sl?: number;

  @ApiProperty({
    description: 'Take Profit level',
    example: 1.1950,
  })
  tp?: number;

  @ApiProperty({
    description: 'Magic number',
    example: 12345,
  })
  magic?: number;
}

export class GetHistoryResponseDto {
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
    description: 'Array of trade history',
    type: [TradeHistoryDto],
    required: false,
  })
  history?: TradeHistoryDto[];

  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  pageNumber?: number;

  @ApiProperty({
    description: 'Total pages',
    example: 10,
    required: false,
  })
  totalPages?: number;
}

