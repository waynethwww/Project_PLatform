import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

