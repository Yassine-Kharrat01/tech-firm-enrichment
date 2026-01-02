import { Module } from '@nestjs/common';
import { FirmographicsService } from './firmographics.service';

@Module({
    providers: [FirmographicsService],
    exports: [FirmographicsService],
})
export class FirmographicsModule { }
