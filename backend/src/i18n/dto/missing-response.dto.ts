export interface MissingResponseDto {
  publicId: string;
  locale: string;
  namespace: string;
  key: string;
  seenAt: Date;
  resolved: boolean;
}

export interface MissingListResponseDto {
  items: MissingResponseDto[];
  total: number;
}

export interface MissingStatsResponseDto {
  pending: number;
  resolved: number;
  byNamespace: Record<string, number>;
}
