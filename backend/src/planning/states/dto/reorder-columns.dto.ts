import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderColumnsDto {
  /** publicIds das colunas na nova ordem desejada */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  orderedPublicIds!: string[];
}
