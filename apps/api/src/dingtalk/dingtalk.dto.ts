import { IsString } from 'class-validator';

export class DingtalkLoginDto {
  @IsString()
  authCode!: string;
}

