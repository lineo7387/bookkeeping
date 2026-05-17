# M1 Auth Ledger Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 M1 的账号、认证、账本、成员权限和 Policy 层，让 NestJS 成为可登录、可创建账本、可按成员角色访问资源的主业务 API。

**Architecture:** M1 采用 NestJS 模块化单体：`auth` 负责注册、登录、刷新和退出，`users` 负责用户资料，`ledgers` 负责账本与成员，`policies` 统一封装账本权限判断，`prisma` 作为唯一数据库访问入口。Controller 只处理 HTTP 入参和响应，Service 负责编排，Repository 封装 Prisma 查询，Guard/Policy 负责认证与授权。

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, `@nestjs/jwt`, Passport JWT, Argon2, `class-validator`, `class-transformer`, Jest, Supertest.

---

## Scope

M1 覆盖：

- 用户注册、登录、刷新 token、退出、`GET /auth/me`。
- 用户会话表 `user_sessions`，保存 refresh token 摘要、设备信息和撤销时间。
- 个人账本和家庭账本创建、列表、详情、更新、归档。
- 成员列表、成员角色更新、移除。
- 统一 Policy 层：`canViewLedger`、`canManageLedger`、`canCreateTransaction`、`canUpdateTransaction`、`canViewTransaction`、`canViewAccount` 的 M1 可用骨架。
- 统一认证 Guard 和账本成员权限 Guard。

M1 不覆盖：

- 邀请链接发送和接受流程，只预留 `ledger_invitations` 表和文档。
- 账户、分类、流水、AI 任务的业务 API，只在 Policy 中保留方法签名和测试骨架。
- FastAPI AI 服务脚手架。
- 前端接入真实 API。

## Files

- Create: `docs/modules/auth/认证与会话说明.md`
- Create: `docs/modules/ledgers/账本与成员权限说明.md`
- Modify: `docs/modules/api/NestJS服务说明.md`
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/common/api-response.ts`
- Create: `apps/api/src/common/current-user.decorator.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/guards/ledger-policy.guard.ts`
- Create: `apps/api/src/common/guards/ledger-policy.decorator.ts`
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.repository.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/dto/register.dto.ts`
- Create: `apps/api/src/auth/dto/login.dto.ts`
- Create: `apps/api/src/auth/dto/refresh-token.dto.ts`
- Create: `apps/api/src/auth/dto/logout.dto.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/token.service.ts`
- Create: `apps/api/src/ledgers/ledgers.module.ts`
- Create: `apps/api/src/ledgers/ledgers.controller.ts`
- Create: `apps/api/src/ledgers/ledgers.service.ts`
- Create: `apps/api/src/ledgers/ledgers.repository.ts`
- Create: `apps/api/src/ledgers/dto/create-ledger.dto.ts`
- Create: `apps/api/src/ledgers/dto/update-ledger.dto.ts`
- Create: `apps/api/src/ledgers/dto/update-member-role.dto.ts`
- Create: `apps/api/src/policies/policies.module.ts`
- Create: `apps/api/src/policies/ledger-policy.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/ledgers/ledgers.service.spec.ts`
- Create: `apps/api/src/policies/ledger-policy.service.spec.ts`

## Task 1: Install M1 API Dependencies

**Files:**
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add runtime dependencies**

Run:

```bash
pnpm --filter @bookkeeping/api add @nestjs/jwt @nestjs/passport passport passport-jwt argon2 class-transformer class-validator
```

Expected: `apps/api/package.json` contains these dependencies and `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Add test dependencies**

Run:

```bash
pnpm --filter @bookkeeping/api add -D @nestjs/testing jest ts-jest @types/jest supertest @types/supertest @types/passport-jwt
```

Expected: `apps/api/package.json` contains these dev dependencies and `pnpm-lock.yaml` is updated.

- [ ] **Step 3: Add test script**

Modify `apps/api/package.json` scripts:

```json
{
  "test": "jest --passWithNoTests",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage"
}
```

Add Jest config to `apps/api/package.json`:

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 4: Verify dependencies and empty test runner**

Run:

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add api auth test dependencies"
```

## Task 2: Add M1 Chinese Module Documentation

**Files:**
- Create: `docs/modules/auth/认证与会话说明.md`
- Create: `docs/modules/ledgers/账本与成员权限说明.md`
- Modify: `docs/modules/api/NestJS服务说明.md`

- [ ] **Step 1: Write auth module document**

Create `docs/modules/auth/认证与会话说明.md`:

```markdown
# 认证与会话说明

## 功能目标

认证模块提供用户注册、登录、刷新 token、退出登录和当前用户查询能力。NestJS 是唯一对外认证入口，前端不得直接访问数据库或 FastAPI。

## 业务规则

- 用户可以使用邮箱注册和登录，邮箱统一转为小写保存。
- 密码只保存 Argon2 摘要，不保存明文。
- 登录成功后返回 access token 和 refresh token。
- refresh token 只以摘要形式保存到 `user_sessions.refresh_token_hash`。
- 用户退出时撤销对应会话，撤销后的 refresh token 不能再次换取 token。
- `GET /auth/me` 必须通过 JWT 认证后返回当前用户基础资料。

## 数据模型

- `users.email` 唯一，M1 必填。
- `users.phone` 可为空并唯一。
- `user_sessions.user_id` 指向 `users.id`。
- `user_sessions.revoked_at` 非空表示会话已退出或失效。

## 接口说明

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## 权限规则

- 注册、登录、刷新 token 不需要 access token。
- 退出登录需要提交 refresh token，服务端只撤销匹配会话。
- 当前用户接口必须通过 `JwtAuthGuard`。

## 异常情况

- 邮箱已存在返回 `VALIDATION_FAILED`。
- 密码错误返回 `AUTH_REQUIRED`。
- refresh token 不存在、已撤销或过期返回 `TOKEN_EXPIRED`。

## 测试与验证方式

```bash
pnpm --filter @bookkeeping/api test -- auth.service.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

## 扩展点

- 手机号登录和验证码登录。
- 多设备会话管理页。
- 管理员禁用用户后的会话批量撤销。
```

- [ ] **Step 2: Write ledgers and policy module document**

Create `docs/modules/ledgers/账本与成员权限说明.md`:

```markdown
# 账本与成员权限说明

## 功能目标

账本模块提供个人账本、家庭账本和成员角色管理能力。所有业务数据必须归属于 `ledger`，所有协作权限必须通过 `ledger_members` 和 Policy 层判断。

## 业务规则

- 创建账本时，创建者同时成为 `ledger_members.role = owner` 的 active 成员。
- `personal` 和 `family` 账本都使用相同成员模型。
- `owner` 可以管理账本和成员。
- `admin` 可以管理成员，但不能移除 owner。
- `editor` 可以创建流水和编辑自己创建的流水。
- `viewer` 只能查看共享数据。
- 账本删除在 M1 中实现为 `archived_at` 软归档。

## 数据模型

- `ledgers.owner_id` 指向创建者。
- `ledger_members.ledger_id` 和 `ledger_members.user_id` 组合唯一。
- `ledger_members.status = active` 才能访问账本。
- `ledger_invitations` 在 M1 只建表，不开放完整邀请流程。

## 接口说明

- `GET /ledgers`
- `POST /ledgers`
- `GET /ledgers/:ledgerId`
- `PATCH /ledgers/:ledgerId`
- `DELETE /ledgers/:ledgerId`
- `GET /ledgers/:ledgerId/members`
- `PATCH /ledgers/:ledgerId/members/:memberId`
- `DELETE /ledgers/:ledgerId/members/:memberId`

## 权限规则

- `canViewLedger(userId, ledgerId)`：active 成员可查看未归档账本。
- `canManageLedger(userId, ledgerId)`：owner 和 admin 可管理，删除账本仅 owner。
- `canCreateTransaction(userId, ledgerId)`：owner、admin、editor 可创建。
- `canUpdateTransaction(userId, transactionId)`：owner/admin 可更新共享流水，editor 只能更新自己创建的流水，private 流水仅创建者可见和管理。
- `canViewAccount(userId, accountId)`：共享账户 active 成员可见，private 账户仅 owner_id 可见。

## 异常情况

- 非成员访问账本返回 `LEDGER_ACCESS_DENIED`。
- 角色能力不足返回 `MEMBER_ROLE_DENIED`。
- 账本不存在或已归档返回 `LEDGER_NOT_FOUND`。
- 不能移除或降级账本唯一 owner。

## 测试与验证方式

```bash
pnpm --filter @bookkeeping/api test -- ledger-policy.service.spec.ts ledgers.service.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

## 扩展点

- 邀请链接和邀请接受流程。
- 成员操作审计日志。
- 更细粒度的 selected_members 可见性。
```

- [ ] **Step 3: Link docs from API module document**

Append to `docs/modules/api/NestJS服务说明.md`:

```markdown
## M1 模块文档

- `docs/modules/auth/认证与会话说明.md`
- `docs/modules/ledgers/账本与成员权限说明.md`
```

- [ ] **Step 4: Verify documentation references**

Run:

```bash
rg -n "认证与会话|账本与成员权限|Policy|ledger_members" docs/modules docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md
git diff --check
```

Expected: command exits 0 and references are present.

- [ ] **Step 5: Commit**

```bash
git add docs/modules/api/NestJS服务说明.md docs/modules/auth/认证与会话说明.md docs/modules/ledgers/账本与成员权限说明.md
git commit -m "docs: add m1 auth and ledger module specs"
```

## Task 3: Add Prisma Schema For Users, Sessions, Ledgers, Members

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Write schema models**

Replace the schema body after datasource with:

```prisma
enum UserStatus {
  active
  disabled
}

enum LedgerType {
  personal
  family
}

enum LedgerMemberRole {
  owner
  admin
  editor
  viewer
}

enum LedgerMemberStatus {
  active
  invited
  removed
}

enum LedgerInvitationStatus {
  pending
  accepted
  expired
  revoked
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  phone        String?       @unique
  passwordHash String        @map("password_hash")
  nickname     String
  avatarUrl    String?       @map("avatar_url")
  status       UserStatus    @default(active)
  sessions     UserSession[]
  ownedLedgers Ledger[]      @relation("LedgerOwner")
  memberships  LedgerMember[]
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  @@map("users")
}

model UserSession {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  refreshTokenHash String    @map("refresh_token_hash")
  userAgent        String?   @map("user_agent")
  ipAddress        String?   @map("ip_address")
  expiresAt        DateTime  @map("expires_at")
  revokedAt        DateTime? @map("revoked_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([refreshTokenHash])
  @@map("user_sessions")
}

model Ledger {
  id              String             @id @default(uuid())
  name            String
  type            LedgerType
  ownerId         String             @map("owner_id")
  defaultCurrency String             @default("CNY") @map("default_currency")
  timezone        String             @default("Asia/Shanghai")
  archivedAt      DateTime?          @map("archived_at")
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")
  owner           User               @relation("LedgerOwner", fields: [ownerId], references: [id])
  members         LedgerMember[]
  invitations     LedgerInvitation[]

  @@index([ownerId])
  @@index([archivedAt])
  @@map("ledgers")
}

model LedgerMember {
  id        String             @id @default(uuid())
  ledgerId  String             @map("ledger_id")
  userId    String             @map("user_id")
  role      LedgerMemberRole
  status    LedgerMemberStatus @default(active)
  joinedAt  DateTime?          @map("joined_at")
  createdAt DateTime           @default(now()) @map("created_at")
  updatedAt DateTime           @updatedAt @map("updated_at")
  ledger    Ledger             @relation(fields: [ledgerId], references: [id], onDelete: Cascade)
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([ledgerId, userId])
  @@index([ledgerId, status])
  @@index([userId, status])
  @@map("ledger_members")
}

model LedgerInvitation {
  id           String                 @id @default(uuid())
  ledgerId     String                 @map("ledger_id")
  inviterId    String                 @map("inviter_id")
  inviteeEmail String?                @map("invitee_email")
  inviteePhone String?                @map("invitee_phone")
  role         LedgerMemberRole
  token        String                 @unique
  status       LedgerInvitationStatus @default(pending)
  expiresAt    DateTime               @map("expires_at")
  createdAt    DateTime               @default(now()) @map("created_at")
  updatedAt    DateTime               @updatedAt @map("updated_at")
  ledger       Ledger                 @relation(fields: [ledgerId], references: [id], onDelete: Cascade)

  @@index([ledgerId, status])
  @@index([inviteeEmail])
  @@index([inviteePhone])
  @@map("ledger_invitations")
}
```

- [ ] **Step 2: Generate Prisma client**

Run:

```bash
pnpm --filter @bookkeeping/api prisma:generate
```

Expected: Prisma generation exits 0.

- [ ] **Step 3: Validate API build**

Run:

```bash
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat: add m1 prisma identity ledger schema"
```

## Task 4: Add Prisma Module And Common API Utilities

**Files:**
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/common/api-response.ts`
- Create: `apps/api/src/common/current-user.decorator.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create PrismaService**

Create `apps/api/src/prisma/prisma.service.ts`:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Create PrismaModule**

Create `apps/api/src/prisma/prisma.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Create API response helper**

Create `apps/api/src/common/api-response.ts`:

```ts
import type { ApiErrorCode, ApiResponse } from '@bookkeeping/shared-types';

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(code: ApiErrorCode, message: string, details?: unknown): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}
```

- [ ] **Step 4: Create current user decorator**

Create `apps/api/src/common/current-user.decorator.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
```

- [ ] **Step 5: Import PrismaModule**

Modify `apps/api/src/app.module.ts` imports:

```ts
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Verify common infrastructure**

Run:

```bash
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/prisma apps/api/src/common apps/api/src/app.module.ts
git commit -m "feat: add prisma module and api response helpers"
```

## Task 5: Implement Users Repository And Service

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.repository.ts`
- Create: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create users repository**

Create `apps/api/src/users/users.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  create(input: { email: string; passwordHash: string; nickname: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        nickname: input.nickname,
      },
    });
  }
}
```

- [ ] **Step 2: Create users service**

Create `apps/api/src/users/users.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

export interface PublicUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Create users module and import it**

Create `apps/api/src/users/users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
```

Add `UsersModule` to `apps/api/src/app.module.ts`.

- [ ] **Step 4: Verify users module**

Run:

```bash
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/users apps/api/src/app.module.ts
git commit -m "feat: add users module foundation"
```

## Task 6: Implement Auth Service With Tests

**Files:**
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/token.service.ts`
- Create: `apps/api/src/auth/dto/register.dto.ts`
- Create: `apps/api/src/auth/dto/login.dto.ts`
- Create: `apps/api/src/auth/dto/refresh-token.dto.ts`
- Create: `apps/api/src/auth/dto/logout.dto.ts`

- [ ] **Step 1: Write failing auth service tests**

Create `apps/api/src/auth/auth.service.spec.ts` with tests for:

```ts
it('registers a user with lowercase email and creates a refresh session', async () => {
  const result = await service.register({
    email: 'LINEO@EXAMPLE.COM',
    password: 'StrongPass123',
    nickname: 'Lineo',
    userAgent: 'Vitest Browser',
    ipAddress: '127.0.0.1',
  });

  expect(result.user.email).toBe('lineo@example.com');
  expect(result.accessToken).toEqual('access-token');
  expect(result.refreshToken).toEqual('refresh-token');
  expect(usersRepository.create).toHaveBeenCalledWith({
    email: 'lineo@example.com',
    passwordHash: expect.stringContaining('argon2') as string,
    nickname: 'Lineo',
  });
});

it('rejects duplicate registration email', async () => {
  usersRepository.findByEmail.mockResolvedValue(existingUser);
  await expect(
    service.register({
      email: 'lineo@example.com',
      password: 'StrongPass123',
      nickname: 'Lineo',
    }),
  ).rejects.toMatchObject({ response: { error: { code: 'VALIDATION_FAILED' } } });
});

it('logs in with valid password and rejects invalid password', async () => {
  usersRepository.findByEmail.mockResolvedValue(existingUserWithHash);
  await expect(
    service.login({ email: 'lineo@example.com', password: 'wrong' }),
  ).rejects.toMatchObject({ response: { error: { code: 'AUTH_REQUIRED' } } });
});

it('refreshes tokens only for an active non-revoked session', async () => {
  sessionsRepository.findActiveByRefreshTokenHash.mockResolvedValue(activeSession);
  const result = await service.refresh({ refreshToken: 'refresh-token' });
  expect(result.accessToken).toEqual('access-token');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @bookkeeping/api test -- auth.service.spec.ts
```

Expected: FAIL because `AuthService` and dependencies are not implemented.

- [ ] **Step 3: Implement DTOs**

Use `class-validator` DTOs:

```ts
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  nickname!: string;
}
```

Create matching `LoginDto`, `RefreshTokenDto`, and `LogoutDto` with email/password or refresh token fields.

- [ ] **Step 4: Implement TokenService and AuthService**

`TokenService` signs access and refresh tokens with `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, and `JWT_REFRESH_EXPIRES_IN`.

`AuthService` must expose:

```ts
register(input: RegisterInput): Promise<AuthResult>;
login(input: LoginInput): Promise<AuthResult>;
refresh(input: RefreshInput): Promise<AuthResult>;
logout(input: LogoutInput): Promise<{ revoked: true }>;
validateUser(userId: string): Promise<PublicUser | null>;
```

Rules:

- Normalize email with `email.toLowerCase()`.
- Hash password and refresh token with Argon2.
- Store only `refreshTokenHash`.
- Throw `UnauthorizedException(fail('AUTH_REQUIRED', 'Invalid credentials'))` for login failure.
- Throw `UnauthorizedException(fail('TOKEN_EXPIRED', 'Refresh token is invalid or expired'))` for invalid refresh.
- Throw `BadRequestException(fail('VALIDATION_FAILED', 'Email is already registered'))` for duplicate email.

- [ ] **Step 5: Run auth tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- auth.service.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth
git commit -m "feat: add auth service and token lifecycle"
```

## Task 7: Implement Auth Controller And JWT Guard

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Enable validation pipe**

Modify `apps/api/src/main.ts`:

```ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

- [ ] **Step 2: Create JWT strategy and guard**

`JwtStrategy` must read bearer tokens and validate into:

```ts
export interface JwtPayload {
  sub: string;
  email: string;
}
```

`JwtAuthGuard` extends `AuthGuard('jwt')`.

- [ ] **Step 3: Create auth controller**

Routes:

```ts
@Post('register')
register(@Body() dto: RegisterDto, @Req() request: Request) {
  return ok(await this.authService.register({ ...dto, userAgent: request.headers['user-agent'], ipAddress: request.ip }));
}

@Post('login')
login(@Body() dto: LoginDto, @Req() request: Request) {
  return ok(await this.authService.login({ ...dto, userAgent: request.headers['user-agent'], ipAddress: request.ip }));
}

@Post('refresh')
refresh(@Body() dto: RefreshTokenDto) {
  return ok(await this.authService.refresh(dto));
}

@Post('logout')
logout(@Body() dto: LogoutDto) {
  return ok(await this.authService.logout(dto));
}

@Get('me')
@UseGuards(JwtAuthGuard)
me(@CurrentUser() user: AuthenticatedUser) {
  return ok(await this.authService.validateUser(user.id));
}
```

- [ ] **Step 4: Register AuthModule**

`AuthModule` imports `PassportModule`, `JwtModule`, and `UsersModule`; exports `AuthService`.

Add `AuthModule` to `AppModule`.

- [ ] **Step 5: Verify auth API**

Run:

```bash
pnpm --filter @bookkeeping/api test -- auth.service.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth apps/api/src/common apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat: expose auth controller and jwt guard"
```

## Task 8: Implement Ledger Policy Service With Tests

**Files:**
- Create: `apps/api/src/policies/policies.module.ts`
- Create: `apps/api/src/policies/ledger-policy.service.ts`
- Create: `apps/api/src/policies/ledger-policy.service.spec.ts`

- [ ] **Step 1: Write failing policy tests**

Create tests for:

```ts
it('allows active members to view ledgers', async () => {
  prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'viewer', status: 'active' });
  await expect(service.canViewLedger('user_1', 'ledger_1')).resolves.toBe(true);
});

it('denies removed members', async () => {
  prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'removed' });
  await expect(service.canViewLedger('user_1', 'ledger_1')).resolves.toBe(false);
});

it('allows only owner and admin to manage ledger', async () => {
  prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'active' });
  await expect(service.canManageLedger('user_1', 'ledger_1')).resolves.toBe(false);
});

it('allows owner admin and editor to create transactions', async () => {
  prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'active' });
  await expect(service.canCreateTransaction('user_1', 'ledger_1')).resolves.toBe(true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledger-policy.service.spec.ts
```

Expected: FAIL because policy service is missing.

- [ ] **Step 3: Implement policy service**

Create role helpers:

```ts
const MANAGER_ROLES = new Set(['owner', 'admin']);
const EDITOR_ROLES = new Set(['owner', 'admin', 'editor']);
```

Methods:

```ts
canViewLedger(userId: string, ledgerId: string): Promise<boolean>;
canManageLedger(userId: string, ledgerId: string): Promise<boolean>;
canCreateTransaction(userId: string, ledgerId: string): Promise<boolean>;
canUpdateTransaction(userId: string, transactionId: string): Promise<boolean>;
canViewTransaction(userId: string, transactionId: string): Promise<boolean>;
canViewAccount(userId: string, accountId: string): Promise<boolean>;
```

M1 implementation:

- `canViewLedger`: active member and ledger not archived.
- `canManageLedger`: active owner/admin and ledger not archived.
- `canCreateTransaction`: active owner/admin/editor and ledger not archived.
- Transaction/account methods return false when related models do not exist yet; leave method signatures stable for M2.

- [ ] **Step 4: Run policy tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledger-policy.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/policies
git commit -m "feat: add ledger policy service"
```

## Task 9: Implement Ledgers Service With Tests

**Files:**
- Create: `apps/api/src/ledgers/ledgers.repository.ts`
- Create: `apps/api/src/ledgers/ledgers.service.ts`
- Create: `apps/api/src/ledgers/ledgers.service.spec.ts`
- Create: `apps/api/src/ledgers/dto/create-ledger.dto.ts`
- Create: `apps/api/src/ledgers/dto/update-ledger.dto.ts`
- Create: `apps/api/src/ledgers/dto/update-member-role.dto.ts`

- [ ] **Step 1: Write failing ledgers service tests**

Create tests for:

```ts
it('creates a ledger and owner membership in one transaction', async () => {
  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  prisma.ledger.create.mockResolvedValue(familyLedger);
  prisma.ledgerMember.create.mockResolvedValue(ownerMember);

  const result = await service.createLedger('user_1', {
    name: '家庭账本',
    type: 'family',
    defaultCurrency: 'CNY',
    timezone: 'Asia/Shanghai',
  });

  expect(result.currentMember.role).toBe('owner');
  expect(prisma.ledger.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ ownerId: 'user_1', name: '家庭账本' }),
  });
});

it('lists only active memberships and non-archived ledgers', async () => {
  prisma.ledgerMember.findMany.mockResolvedValue([ownerMemberWithLedger]);
  const result = await service.listLedgers('user_1');
  expect(result).toHaveLength(1);
});

it('requires manage policy before updating ledger', async () => {
  policy.canManageLedger.mockResolvedValue(false);
  await expect(service.updateLedger('user_1', 'ledger_1', { name: '新名称' })).rejects.toMatchObject({
    response: { error: { code: 'MEMBER_ROLE_DENIED' } },
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledgers.service.spec.ts
```

Expected: FAIL because ledgers service is missing.

- [ ] **Step 3: Implement DTOs**

`CreateLedgerDto`:

```ts
export class CreateLedgerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(['personal', 'family'])
  type!: 'personal' | 'family';

  @IsString()
  @Length(3, 3)
  defaultCurrency = 'CNY';

  @IsString()
  timezone = 'Asia/Shanghai';
}
```

`UpdateLedgerDto` allows `name`, `defaultCurrency`, and `timezone`. `UpdateMemberRoleDto` allows `admin`, `editor`, and `viewer`; owner changes require a separate transfer-owner flow outside M1.

- [ ] **Step 4: Implement repository and service**

Repository methods:

```ts
createWithOwner(userId: string, dto: CreateLedgerDto): Promise<LedgerSummary>;
findLedgersForUser(userId: string): Promise<LedgerSummary[]>;
findLedgerForUser(userId: string, ledgerId: string): Promise<LedgerSummary | null>;
updateLedger(ledgerId: string, dto: UpdateLedgerDto): Promise<LedgerSummary>;
archiveLedger(ledgerId: string): Promise<void>;
listMembers(ledgerId: string): Promise<LedgerMemberSummary[]>;
updateMemberRole(memberId: string, role: 'admin' | 'editor' | 'viewer'): Promise<LedgerMemberSummary>;
removeMember(memberId: string): Promise<LedgerMemberSummary>;
```

Service rules:

- Create ledger and owner member inside `prisma.$transaction`.
- `listLedgers` filters active membership and `archivedAt: null`.
- `getLedger` requires `canViewLedger`.
- `updateLedger` and `listMembers` require `canManageLedger`.
- `archiveLedger` requires owner role.
- `updateMemberRole` cannot change owner.
- `removeMember` cannot remove owner.

- [ ] **Step 5: Run ledgers tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledgers.service.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/ledgers
git commit -m "feat: add ledger service and member rules"
```

## Task 10: Expose Ledgers Controller And Policy Guard

**Files:**
- Create: `apps/api/src/ledgers/ledgers.controller.ts`
- Create: `apps/api/src/ledgers/ledgers.module.ts`
- Create: `apps/api/src/common/guards/ledger-policy.guard.ts`
- Create: `apps/api/src/common/guards/ledger-policy.decorator.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create ledger policy decorator**

Create:

```ts
export const LEDGER_POLICY_KEY = 'ledger_policy';
export type LedgerPolicyAction = 'view' | 'manage' | 'create_transaction';
export const RequireLedgerPolicy = (action: LedgerPolicyAction) =>
  SetMetadata(LEDGER_POLICY_KEY, action);
```

- [ ] **Step 2: Create ledger policy guard**

Guard rules:

- Read `ledgerId` from `request.params.ledgerId`.
- Read action from metadata.
- Read user id from `request.user.id`.
- Call `LedgerPolicyService`.
- Throw `ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'))` for view denial.
- Throw `ForbiddenException(fail('MEMBER_ROLE_DENIED', 'Member role denied'))` for manage/create denial.

- [ ] **Step 3: Create ledgers controller**

Routes:

```ts
@Get()
list(@CurrentUser() user: AuthenticatedUser) {
  return ok(await this.ledgersService.listLedgers(user.id));
}

@Post()
create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLedgerDto) {
  return ok(await this.ledgersService.createLedger(user.id, dto));
}

@Get(':ledgerId')
@RequireLedgerPolicy('view')
get(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string) {
  return ok(await this.ledgersService.getLedger(user.id, ledgerId));
}

@Patch(':ledgerId')
@RequireLedgerPolicy('manage')
update(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string, @Body() dto: UpdateLedgerDto) {
  return ok(await this.ledgersService.updateLedger(user.id, ledgerId, dto));
}

@Delete(':ledgerId')
@RequireLedgerPolicy('manage')
archive(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string) {
  return ok(await this.ledgersService.archiveLedger(user.id, ledgerId));
}
```

Member routes:

```ts
GET /ledgers/:ledgerId/members
PATCH /ledgers/:ledgerId/members/:memberId
DELETE /ledgers/:ledgerId/members/:memberId
```

All member routes use `JwtAuthGuard` and `RequireLedgerPolicy('manage')`.

- [ ] **Step 4: Register modules**

`LedgersModule` imports `PoliciesModule` and exports `LedgersService`. Add `LedgersModule` and `PoliciesModule` to `AppModule`.

- [ ] **Step 5: Verify controllers and guards**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledgers.service.spec.ts ledger-policy.service.spec.ts auth.service.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/ledgers apps/api/src/common/guards apps/api/src/app.module.ts
git commit -m "feat: expose ledger api with policy guard"
```

## Task 11: Final M1 Verification

**Files:**
- Review: all files touched in Tasks 1-10

- [ ] **Step 1: Run API tests**

```bash
pnpm --filter @bookkeeping/api test
```

Expected: all API tests pass.

- [ ] **Step 2: Run API typecheck and build**

```bash
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: both commands exit 0.

- [ ] **Step 3: Run workspace build**

```bash
pnpm build
```

Expected: all workspace packages build successfully.

- [ ] **Step 4: Run diff hygiene**

```bash
git diff --check
git status --short --branch
```

Expected: `git diff --check` exits 0; status only contains intentional M1 changes before the final commit or is clean after the final commit.

- [ ] **Step 5: Review project rules**

Check:

```bash
rg -n "FastAPI|ledger_members|Policy|用户确认|ledger" AGENTS.md .codex docs/modules docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md
```

Expected:

- No frontend code calls FastAPI.
- Auth and ledger behavior has Simplified Chinese module docs.
- All ledger permission decisions go through `LedgerPolicyService` or `LedgerPolicyGuard`.
- Transaction-related policy methods keep `ledger` ownership assumptions for M2.

- [ ] **Step 6: Commit final verification notes if docs changed**

If verification adds or updates documentation, commit:

```bash
git add docs
git commit -m "docs: update m1 verification notes"
```

If no files changed, do not create an empty commit.

## Commit Sequence Summary

1. `chore: add api auth test dependencies`
2. `docs: add m1 auth and ledger module specs`
3. `feat: add m1 prisma identity ledger schema`
4. `feat: add prisma module and api response helpers`
5. `feat: add users module foundation`
6. `feat: add auth service and token lifecycle`
7. `feat: expose auth controller and jwt guard`
8. `feat: add ledger policy service`
9. `feat: add ledger service and member rules`
10. `feat: expose ledger api with policy guard`
11. Optional: `docs: update m1 verification notes`

## Self-Review

- Spec coverage: M1 covers account identity, authentication/session lifecycle, ledgers, members, and Policy layer. Invitations, accounts, categories, transactions, and AI remain outside M1 implementation scope but retain schema or policy entry points where needed.
- Placeholder scan: no task depends on undefined external scaffolding; FastAPI and mobile scaffolding are intentionally excluded.
- Type consistency: `LedgerRole`, `LedgerPermission`, `TransactionVisibility`, API response shape, and ledger ownership rules match `packages/shared-types` and the product spec.
