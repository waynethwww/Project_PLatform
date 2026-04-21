import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import {
  ExpertNetworkBootstrapQueryDto,
  ExpertNetworkDashboardQueryDto,
  UpsertExpertNetworkReportDto,
} from './expert-network.dto';
import { ExpertNetworkService } from './expert-network.service';

@Controller('expert-network')
export class ExpertNetworkController {
  constructor(private readonly expertNetworkService: ExpertNetworkService) {}

  @Get('bootstrap')
  getBootstrap(@Query() query: ExpertNetworkBootstrapQueryDto) {
    return this.expertNetworkService.getBootstrap(query.weekStart);
  }

  @Get('dashboard')
  getDashboard(@Query() query: ExpertNetworkDashboardQueryDto) {
    return this.expertNetworkService.getDashboard(query.startDate, query.endDate);
  }

  @Get()
  listReports() {
    return this.expertNetworkService.listReports();
  }

  @Post()
  createReport(@Body() payload: UpsertExpertNetworkReportDto) {
    return this.expertNetworkService.createReport(payload);
  }

  @Put(':id')
  updateReport(
    @Param('id') id: string,
    @Body() payload: UpsertExpertNetworkReportDto,
  ) {
    return this.expertNetworkService.updateReport(id, payload);
  }

  @Delete(':id')
  deleteReport(@Param('id') id: string) {
    return this.expertNetworkService.deleteReport(id);
  }
}
