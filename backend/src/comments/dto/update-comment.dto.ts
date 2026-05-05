import { IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  mentionedUserPublicIds?: string[];
}
