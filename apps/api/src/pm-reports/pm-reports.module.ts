import { Module } from '@nestjs/common';

import { PmReportsController } from './pm-reports.controller';
import { PmReportsService } from './pm-reports.service';

@Module({
  controllers: [PmReportsController],
  providers: [PmReportsService],
})
export class PmReportsModule {}

