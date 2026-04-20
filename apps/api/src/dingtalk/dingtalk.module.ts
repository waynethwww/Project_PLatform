import { Module } from '@nestjs/common';

import { DingtalkController } from './dingtalk.controller';
import { DingtalkService } from './dingtalk.service';

@Module({
  controllers: [DingtalkController],
  providers: [DingtalkService],
  exports: [DingtalkService],
})
export class DingtalkModule {}

