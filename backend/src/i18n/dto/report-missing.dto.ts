import { IsString } from 'class-validator';

export class ReportMissingDto {
  @IsString()
  declare locale: string;

  @IsString()
  declare namespace: string;

  @IsString()
  declare key: string;
}
