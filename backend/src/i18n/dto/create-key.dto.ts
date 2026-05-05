import { IsObject, IsString, Matches } from 'class-validator';

export class CreateKeyDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,2}$/, {
    message: 'key must follow format: section.key or section.subsection.key',
  })
  declare key: string;

  @IsObject()
  declare values: Record<string, string>; // { 'pt-PT': 'Guardar', 'en': 'Save', ... }
}
