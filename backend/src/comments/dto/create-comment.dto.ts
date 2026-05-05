import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { EntityType } from '@prisma/client';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsString()
  entityPublicId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  mentionedUserPublicIds?: string[];
}
