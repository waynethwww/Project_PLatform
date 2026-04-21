import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './common/database.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DingtalkModule } from './dingtalk/dingtalk.module';
import { ExpertNetworkModule } from './expert-network/expert-network.module';
import { PmReportsModule } from './pm-reports/pm-reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    DingtalkModule,
    DashboardModule,
    ExpertNetworkModule,
    PmReportsModule,
  ],
})
export class AppModule {}
