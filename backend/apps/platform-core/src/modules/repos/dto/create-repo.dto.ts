// apps/platform-core/src/modules/repos/dto/create-repo.dto.ts
// DTOs for repository operations

import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum, IsUrl, Min, Max } from 'class-validator';

export class CreateRepositoryDto {
    @IsString()
    name: string;

    @IsString()
    gitUrl: string;

    @IsOptional()
    @IsString()
    defaultBranch?: string = 'main';

    @IsArray()
    @IsString({ each: true })
    namespaceIds: string[];

    @IsOptional()
    @IsBoolean()
    realtimeSyncEnabled?: boolean = false;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(1440) // Max 24 hours
    syncIntervalMinutes?: number = 5;
}

export class UpdateRepositoryDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    defaultBranch?: string;

    @IsOptional()
    @IsBoolean()
    realtimeSyncEnabled?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(1440)
    syncIntervalMinutes?: number;
}

export class UpdateSyncSettingsDto {
    @IsBoolean()
    realtimeSyncEnabled: boolean;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(1440)
    syncIntervalMinutes?: number = 5;
}

export class BranchListResponseDto {
    branches: BranchDto[];
    defaultBranch: string;
}

export class BranchDto {
    name: string;
    sha: string;
    isDefault: boolean;
}

export class SyncStatusDto {
    lastSyncedAt: Date | null;
    lastSyncedSha: string | null;
    realtimeSyncEnabled: boolean;
    syncIntervalMinutes: number;
    nextSyncAt?: Date;
}

export class ManualSyncResponseDto {
    success: boolean;
    newCommits: number;
    latestSha: string | null;
    error?: string;
}

export class DetectBranchRequestDto {
    @IsString()
    gitUrl: string;
}

export class DetectBranchResponseDto {
    defaultBranch: string;
    branches: BranchDto[];
    providerType: string;
}
