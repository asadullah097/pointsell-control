import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminReplyDto {
  @ApiProperty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminName?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ['in_progress', 'resolved', 'closed'] })
  @IsEnum(['in_progress', 'resolved', 'closed'])
  status: 'in_progress' | 'resolved' | 'closed';
}
