import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderSwimlanesDto {
  /** publicIds das swimlanes na nova ordem desejada */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  orderedPublicIds!: string[];
}
