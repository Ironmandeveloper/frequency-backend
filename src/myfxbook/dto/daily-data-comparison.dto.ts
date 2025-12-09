import { ApiProperty } from '@nestjs/swagger';

class PeriodData {
  @ApiProperty({
    description: 'Sum of all profit for the period',
    example: 1250.5,
  })
  totalProfit: number;

  @ApiProperty({
    description: 'Sum of all pips for the period',
    example: 150.25,
  })
  totalPips: number;

  @ApiProperty({
    description: 'Start date of the period',
    example: '2024-01-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date of the period',
    example: '2024-01-31',
  })
  endDate: string;
}

class PeriodComparison {
  @ApiProperty({
    description: 'Current period data',
    type: PeriodData,
  })
  current: PeriodData;

  @ApiProperty({
    description: 'Previous period data',
    type: PeriodData,
  })
  previous: PeriodData;

  @ApiProperty({
    description: 'Difference in profit between current and previous period',
    example: 150.25,
  })
  profitDifference: number;

  @ApiProperty({
    description: 'Difference in pips between current and previous period',
    example: 25.5,
  })
  pipsDifference: number;
}

export class DailyDataComparisonDto {
  @ApiProperty({
    description: 'Today vs Yesterday comparison',
    type: PeriodComparison,
  })
  todayVsYesterday: PeriodComparison;

  @ApiProperty({
    description: 'This week vs Previous week comparison',
    type: PeriodComparison,
  })
  thisWeekVsPreviousWeek: PeriodComparison;

  @ApiProperty({
    description: 'This month vs Previous month comparison',
    type: PeriodComparison,
  })
  thisMonthVsPreviousMonth: PeriodComparison;

  @ApiProperty({
    description: 'This year vs Previous year comparison',
    type: PeriodComparison,
  })
  thisYearVsPreviousYear: PeriodComparison;
}

