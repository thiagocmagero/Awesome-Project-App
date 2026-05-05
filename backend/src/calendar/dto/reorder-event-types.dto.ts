import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderEventTypesDto {
  /** publicIds dos tipos na ordem desejada (todos os tipos activos do projecto) */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  orderedPublicIds!: string[];
}
