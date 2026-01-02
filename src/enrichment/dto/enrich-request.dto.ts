import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class EnrichRequestDto {
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim().toLowerCase())
    domain: string;

    @IsBoolean()
    @IsOptional()
    forceBrowser?: boolean;
}
