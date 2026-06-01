import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@pointsell.app', description: 'Admin email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyStr0ngPass!', description: 'Admin password' })
  @IsString()
  @MinLength(6)
  password: string;
}
