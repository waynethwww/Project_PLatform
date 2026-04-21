import { Module } from '@nestjs/common';

import { ExpertNetworkController } from './expert-network.controller';
import { ExpertNetworkService } from './expert-network.service';

@Module({
  controllers: [ExpertNetworkController],
  providers: [ExpertNetworkService],
})
export class ExpertNetworkModule {}
