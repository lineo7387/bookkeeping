import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/bookkeeping?schema=public';
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('constructs the Prisma 7 client with a PostgreSQL adapter', () => {
    expect(() => new PrismaService()).not.toThrow();
  });
});
