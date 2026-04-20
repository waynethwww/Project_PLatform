import { Controller, Get, Query } from '@nestjs/common';

import { DashboardQueryDto, ProjectProgressQueryDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getOverview(query);
  }

  @Get('project-progress')
  getProjectProgress(@Query() query: ProjectProgressQueryDto) {
    return this.dashboardService.getProjectProgress(query);
  }

  @Get('risk-trend')
  getRiskTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getRiskTrend(query);
  }

  @Get('cost-roi-trend')
  getCostRoiTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getCostRoiTrend(query);
  }

  @Get('supplier-trend')
  getSupplierTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getSupplierTrend(query);
  }

  @Get('algo-trend')
  getAlgoTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getAlgoTrend(query);
  }
}

