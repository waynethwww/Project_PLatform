import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RiskItemDto {
  @IsString()
  id!: string;

  @IsIn(['绿', '黄', '红'])
  level!: '绿' | '黄' | '红';

  @IsString()
  title!: string;

  @IsIn(['open', 'watching', 'closed'])
  status!: 'open' | 'watching' | 'closed';

  @IsDateString()
  dueDate!: string;

  @IsString()
  description!: string;

  @IsString()
  action!: string;
}

export class PmReportsQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class UpsertProjectDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  pmName!: string;

  @IsString()
  curveType!: string;

  @IsString()
  annotationType!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedQty!: number;

  @IsString()
  qtyUnit!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetTotal!: number;

  @IsString()
  defaultSupplier!: string;
}

export class UpsertPmWeeklyReportDto {
  @IsString()
  projectId!: string;

  @IsDateString()
  weekStart!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  progressPct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualQty!: number;

  @Type(() => Number)
  @IsNumber()
  weeklyDeliveryAmount!: number;

  @Type(() => Number)
  @IsNumber()
  amountDelivered!: number;

  @Type(() => Number)
  @IsNumber()
  costConsumed!: number;

  @Type(() => Number)
  @IsNumber()
  qualityPass!: number;

  @Type(() => Number)
  @IsNumber()
  clientScore!: number;

  @IsIn(['绿', '黄', '红'])
  riskLevel!: '绿' | '黄' | '红';

  @IsString()
  riskDesc!: string;

  @IsString()
  blockerTitle!: string;

  @IsIn(['open', 'watching', 'closed'])
  blockerStatus!: 'open' | 'watching' | 'closed';

  @IsDateString()
  blockerDueDate!: string;

  @IsString()
  suggestedAction!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiskItemDto)
  riskItems!: RiskItemDto[];

  @IsString()
  supplierName!: string;

  @Type(() => Number)
  @IsNumber()
  supplierHeadcount!: number;

  @Type(() => Number)
  @IsNumber()
  supplierQuality!: number;

  @Type(() => Number)
  @IsNumber()
  supplierOtdRate!: number;

  @Type(() => Number)
  @IsNumber()
  supplierCooperation!: number;

  @IsString()
  supplierIssue!: string;

  @IsString()
  algoVersion!: string;

  @Type(() => Number)
  @IsNumber()
  modificationRate!: number;

  @Type(() => Number)
  @IsNumber()
  timeSavePct!: number;

  @IsString()
  algoAdvice!: string;

  @Type(() => Number)
  @IsNumber()
  hoursSpent!: number;

  @Type(() => Number)
  @IsNumber()
  pmHourlyCost!: number;

  @IsString()
  pmComment!: string;

  @IsString()
  nextWeekFocus!: string;

  @IsIn(['draft', 'submitted'])
  status!: 'draft' | 'submitted';
}
