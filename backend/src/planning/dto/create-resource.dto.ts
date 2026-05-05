import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  text!: string;

  /** publicId do UserType — obrigatório para recursos externos */
  @IsUUID()
  userTypeId!: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursPerDay?: number;
}
