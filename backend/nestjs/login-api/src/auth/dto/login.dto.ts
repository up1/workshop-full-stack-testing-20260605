import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user1', description: 'The username of the user' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'validPassword', description: 'The user password' })
  @IsString()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token issued on successful login' })
  token: string;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Error message describing why the request failed' })
  error: string;
}
