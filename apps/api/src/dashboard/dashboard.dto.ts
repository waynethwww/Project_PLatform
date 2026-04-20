import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

const PERIOD_MODES = ['latest', 'period'] as const;
const GROUP_BY = ['project', 'pm', 'curve', 'department', 'supplier'] as const;

export class DashboardQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsIn(PERIOD_MODES)
  mode: (typeof PERIOD_MODES)[number] = 'period';

  @IsOptional()
  @Transform(({ value }) => (value ? String(value) : undefined))
  departmentId?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value) : undefined))
  pmId?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value) : undefined))
  curveType?: string;
}

export class ProjectProgressQueryDto extends DashboardQueryDto {
  @IsOptional()
  @IsIn(GROUP_BY)
  groupBy: (typeof GROUP_BY)[number] = 'project';
}

