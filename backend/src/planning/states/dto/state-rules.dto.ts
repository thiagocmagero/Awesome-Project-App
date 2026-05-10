import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { TaskFieldKey } from '@prisma/client';

export class FieldRuleDto {
  @IsEnum(TaskFieldKey)
  field!: TaskFieldKey;

  @IsBoolean()
  isRequired!: boolean;
}

export class UpsertStateRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldRuleDto)
  rules!: FieldRuleDto[];
}
