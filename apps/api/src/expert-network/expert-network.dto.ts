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

export class ExpertDomainDistributionItemDto {
  @IsString()
  id!: string;

  @IsString()
  domain!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  count!: number;
}

export class ExpertNetworkBootstrapQueryDto {
  @IsOptional()
  @IsDateString()
  weekStart?: string;
}

export class ExpertNetworkDashboardQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpsertExpertNetworkReportDto {
  @IsDateString()
  weekStart!: string;

  @IsString()
  ownerName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newExpertsCount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weeklySubmittedCases!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalQcPassedCases!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  activeExpertsCount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpertDomainDistributionItemDto)
  totalDomainDistribution!: ExpertDomainDistributionItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpertDomainDistributionItemDto)
  weeklyNewDomainDistribution!: ExpertDomainDistributionItemDto[];

  @IsString()
  summary!: string;

  @IsString()
  nextWeekFocus!: string;

  @IsString()
  remarks!: string;

  @IsIn(['draft', 'submitted'])
  status!: 'draft' | 'submitted';
}
