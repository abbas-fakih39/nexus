import { Module } from '@nestjs/common';
import { TardinessController } from './tardiness.controller';
import { TardinessService } from './tardiness.service';

@Module({
  controllers: [TardinessController],
  providers: [TardinessService],
})
export class TardinessModule {}
