import { ApiProperty } from '@nestjs/swagger';

class PeriodGain {
  @ApiProperty({
    description: 'Gain value for the period',
    example: 1250.5,
  })
  gain: number;

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
    description: 'Current period gain data',
    type: PeriodGain,
  })
  current: PeriodGain;

  @ApiProperty({
    description: 'Previous period gain data',
    type: PeriodGain,
  })
  previous: PeriodGain;

  @ApiProperty({
    description: 'Difference between current and previous period gain',
    example: 150.25,
  })
  difference: number;

  @ApiProperty({
    description: 'Difference as percentage',
    example: 12.5,
  })
  differencePercent: number;
}

export class GainComparisonDto {
  @ApiProperty({
    description: 'Today vs Yesterday gain comparison',
    type: PeriodComparison,
  })
  todayVsYesterday: PeriodComparison;

  @ApiProperty({
    description: 'This week vs Previous week gain comparison',
    type: PeriodComparison,
  })
  thisWeekVsPreviousWeek: PeriodComparison;

  @ApiProperty({
    description: 'This month vs Previous month gain comparison',
    type: PeriodComparison,
  })
  thisMonthVsPreviousMonth: PeriodComparison;

  @ApiProperty({
    description: 'This year vs Previous year gain comparison',
    type: PeriodComparison,
  })
  thisYearVsPreviousYear: PeriodComparison;
}

