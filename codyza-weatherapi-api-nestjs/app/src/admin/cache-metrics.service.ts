import { Injectable } from '@nestjs/common';

export interface CachePerformanceSnapshot {
  hits: number;
  misses: number;
  bypasses: number;
  writes: number;
  hitRate: number;
}

@Injectable()
export class CacheMetricsService {
  private hits = 0;
  private misses = 0;
  private bypasses = 0;
  private writes = 0;

  registerHit(): void {
    this.hits += 1;
  }

  registerMiss(): void {
    this.misses += 1;
  }

  registerBypass(): void {
    this.bypasses += 1;
  }

  registerWrite(): void {
    this.writes += 1;
  }

  getSnapshot(): CachePerformanceSnapshot {
    const attempts = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      bypasses: this.bypasses,
      writes: this.writes,
      hitRate: attempts === 0 ? 0 : Number((this.hits / attempts).toFixed(4)),
    };
  }
}
