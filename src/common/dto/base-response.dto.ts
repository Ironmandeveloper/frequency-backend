import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation successful',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Response data',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: 'Error message (if any)',
    example: 'An error occurred',
    required: false,
  })
  error?: string;

  constructor(success: boolean, data?: T, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    // Only set error if explicitly provided
    this.error = error !== undefined ? error : undefined;
  }

  // Ensure proper JSON serialization
  toJSON() {
    const json: any = {
      success: this.success,
    };
    if (this.message !== undefined) {
      json.message = this.message;
    }
    if (this.data !== undefined) {
      json.data = this.data;
    }
    if (this.error !== undefined) {
      json.error = this.error;
    }
    return json;
  }
}

