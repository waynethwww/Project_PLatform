import { Body, Controller, Post } from '@nestjs/common';

import { DingtalkLoginDto } from './dingtalk.dto';
import { DingtalkService } from './dingtalk.service';

@Controller('dingtalk')
export class DingtalkController {
  constructor(private readonly dingtalkService: DingtalkService) {}

  @Post('login')
  login(@Body() body: DingtalkLoginDto) {
    return this.dingtalkService.loginByAuthCode(body.authCode);
  }

  @Post('sync/organization')
  syncOrganization() {
    return this.dingtalkService.syncOrganization();
  }
}

