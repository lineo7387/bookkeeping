import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './accounts/accounts.module';
import { AdminModule } from './admin/admin.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { LedgersModule } from './ledgers/ledgers.module';
import { PrismaModule } from './prisma/prisma.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),
    AdminModule,
    AuthModule,
    AccountsModule,
    AuditLogsModule,
    CategoriesModule,
    LedgersModule,
    PrismaModule,
    StatisticsModule,
    TransactionsModule,
    UsersModule,
  ],
})
export class AppModule {}
