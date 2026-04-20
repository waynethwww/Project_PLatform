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
  PmReportsQueryDto,
  UpsertPmWeeklyReportDto,
  UpsertProjectDto,
} from './pm-reports.dto';
import { PmReportsService } from './pm-reports.service';

@Controller('pm-weekly-reports')
export class PmReportsController {
  constructor(private readonly pmReportsService: PmReportsService) {}

  @Get('bootstrap')
  getBootstrap(@Query() query: PmReportsQueryDto) {
    return this.pmReportsService.getBootstrap(query.projectId);
  }

  @Get('projects')
  listProjects() {
    return this.pmReportsService.listProjects();
  }

  @Post('projects')
  createProject(@Body() payload: UpsertProjectDto) {
    return this.pmReportsService.createProject(payload);
  }

  @Put('projects/:id')
  updateProject(@Param('id') id: string, @Body() payload: UpsertProjectDto) {
    return this.pmReportsService.updateProject(id, payload);
  }

  @Get()
  listReports(@Query() query: PmReportsQueryDto) {
    return this.pmReportsService.listReports(query.projectId);
  }

  @Get(':id')
  getReport(@Param('id') id: string) {
    return this.pmReportsService.getReport(id);
  }

  @Post()
  createReport(@Body() payload: UpsertPmWeeklyReportDto) {
    return this.pmReportsService.createReport(payload);
  }

  @Put(':id')
  updateReport(
    @Param('id') id: string,
    @Body() payload: UpsertPmWeeklyReportDto,
  ) {
    return this.pmReportsService.updateReport(id, payload);
  }

  @Delete(':id')
  deleteReport(@Param('id') id: string) {
    return this.pmReportsService.deleteReport(id);
  }
}
