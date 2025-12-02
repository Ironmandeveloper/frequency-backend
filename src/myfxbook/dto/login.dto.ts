import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Myfxbook account email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Myfxbook account password',
    example: 'your-password',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

