import { ApiProperty } from '@nestjs/swagger';

export class GainDataPoint {
  @ApiProperty({
    description: 'Date of the gain data point',
    example: '2024-01-01',
  })
  date?: string;

  @ApiProperty({
    description: 'Gain percentage',
    example: 5.25,
  })
  gain?: number;

  @ApiProperty({
    description: 'Balance',
    example: 10525.50,
  })
  balance?: number;
}

export class GainResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  error: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Success',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Array of gain data points',
    type: [GainDataPoint],
    required: false,
  })
  data?: GainDataPoint[];

  @ApiProperty({
    description: 'Total gain percentage',
    example: 25.50,
    required: false,
  })
  totalGain?: number;
}

