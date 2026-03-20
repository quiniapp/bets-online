# Provider Callbacks (21Viral) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the two server-to-server callback endpoints that 21Viral calls during game sessions: `/api/integrations/21viral/players/balance` and `/api/integrations/21viral/players/transactions`, authenticated with HMAC-SHA256 and with full idempotency support.

**Architecture:** Follows existing codebase pattern: routes → controller → domain → repository. New tables `user_provider_profiles` and `provider_transactions` are added via Sequelize migrations. All balance mutations happen inside a Sequelize transaction with `SELECT FOR UPDATE`. HMAC middleware is parametrizable per provider via `createHmacMiddleware(config)`.

**Tech Stack:** Express.js, Sequelize 6 + PostgreSQL, Zod, `decimal.js` (new), `crypto` (Node built-in), Jest + supertest.

**Spec:** `docs/superpowers/specs/2026-03-18-provider-callbacks-design.md`

---

## Chunk 1: Foundation — env vars, types, validators, decimal.js

### Files
- Modify: `.env` and `.env.example` (rename vars)
- Create: `helper/src/types/provider.types.ts`
- Create: `helper/src/validators/provider.validator.ts`
- Modify: `helper/src/types/index.ts` (export new types)
- Modify: `helper/src/validators/index.ts` (export new validators)
- Modify: `api/package.json` (add decimal.js)

---

### Task 1: Rename env vars and add decimal.js

- [ ] **Step 1: Update `.env`**

Open `.env` and rename:
```
# Before:
USERNAME=arenabet
SECRET_KEY=961b4ec6c03ef309663ad3f840fa527e283a3ac5479b994913a721dc30a78f4d

# After:
VIRAL_USERNAME=arenabet
VIRAL_SECRET_KEY=961b4ec6c03ef309663ad3f840fa527e283a3ac5479b994913a721dc30a78f4d
INTEGRATOR_URL=https://api.stg.games-viral.com/
```

- [ ] **Step 2: Update `.env.example`**

Add the same keys to `.env.example`:
```
# 21Viral Integration
VIRAL_USERNAME=your-viral-username
VIRAL_SECRET_KEY=your-viral-secret-key
INTEGRATOR_URL=https://api.stg.games-viral.com/
```

- [ ] **Step 3: Install decimal.js**

```bash
cd C:\Programacion\Casino\bets-online
pnpm --filter api add decimal.js
pnpm --filter api add -D @types/decimal.js
```

Expected: `decimal.js` appears in `api/package.json` dependencies.

- [ ] **Step 4: Commit**

```bash
git checkout -b feature/provider-callbacks
git add .env.example api/package.json
git commit -m "chore: add decimal.js and rename viral env vars"
```

> ⚠️ Do NOT commit `.env` — it's gitignored.

---

### Task 2: Create provider types in helper

- [ ] **Step 1: Create `helper/src/types/provider.types.ts`**

```typescript
export enum TransactionType {
  Debit = 'Debit',
  Credit = 'Credit',
  Reversal = 'Reversal'
}

export enum BetType {
  Cash = 'Cash',
  Promo = 'Promo',
  OperatorFreeSpinBonus = 'OperatorFreeSpinBonus',
  ProviderFreeSpinBonus = 'ProviderFreeSpinBonus'
}

export enum GameRoundStatus {
  Started = 'Started',
  InProgress = 'InProgress',
  None = 'None',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum ViralErrorCode {
  GeneralFailure = 'GeneralFailure',
  AuthenticationFailure = 'AuthenticationFailure',
  RequestValidationFailure = 'RequestValidationFailure',
  InsufficientFunds = 'InsufficientFunds',
  PlayerNotActive = 'PlayerNotActive',
  PlayerBlocked = 'PlayerBlocked',
  PlayerFrozen = 'PlayerFrozen',
  PlayerSelfExclusion = 'PlayerSelfExclusion',
  GameDisabled = 'GameDisabled',
  CurrencyMismatch = 'CurrencyMismatch',
  GameRoundNotFound = 'GameRoundNotFound',
  DoubleTransactionWithDifferentAmount = 'DoubleTransactionWithDifferentAmount',
  RealMoneyNotAllowed = 'RealMoneyNotAllowed',
  LossLimitExceeded = 'LossLimitExceeded',
  SpendLimitExceeded = 'SpendLimitExceeded'
}

export enum AwardType {
  Money = 'Money'
}

export enum JackpotType {
  Jackpot = 'Jackpot',
  GlobalJackpot = 'GlobalJackpot'
}

export enum ReversalOfType {
  Credit = 'Credit',
  Debit = 'Debit'
}

export interface BetOutcomeWin {
  amount: string;
  awardType: AwardType;
  id: string;
  type?: JackpotType;
}

export interface BetOutcomeEventData {
  jackpotWins?: BetOutcomeWin[];
  tournamentWins?: BetOutcomeWin[];
  campaignWins?: BetOutcomeWin[];
  cashBonusWins?: BetOutcomeWin[];
  reversalOfType?: ReversalOfType;
}

export interface ProviderBalanceRequest {
  token: string;
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;
}

export interface ProviderTransactionRequest {
  transactionType: TransactionType;
  betType: BetType;
  gameRoundStatus: GameRoundStatus;
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;
  token?: string;
  amount: string;
  currency?: string;
  providerGameRoundId: string;
  providerTransactionId: string;
  betOutcomeEventData?: BetOutcomeEventData;
}

export interface ProviderBalanceResponse {
  balance: string;
  currency: string;
}

export interface ProviderTransactionResponse {
  balance: string;
  currency: string;
  operatorTransactionId: string;
  alreadyProcessed?: boolean;
}

export interface ViralErrorResponse {
  viralErrorCode: ViralErrorCode;
  message: string;
}

export interface UserProviderProfile {
  id: string;
  userId: string;
  providerName: string;
  providerPlayerId: string;
  currency: string;
  countryCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderTransaction {
  id: string;
  providerName: string;
  providerTransactionId: string;
  providerGameRoundId: string | null;
  providerGameId: string | null;
  providerPlayerId: string;
  userId: string;
  transactionType: TransactionType;
  betType: BetType | null;
  gameRoundStatus: GameRoundStatus | null;
  amount: string;
  currency: string;
  balanceAfter: string;
  betOutcomeEventData: BetOutcomeEventData | null;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Export from `helper/src/types/index.ts`**

Add to the existing exports:
```typescript
export * from './provider.types';
```

- [ ] **Step 3: Commit**

```bash
git add helper/src/types/
git commit -m "feat(helper): add provider types and enums for 21Viral integration"
```

---

### Task 3: Create provider validators in helper

- [ ] **Step 1: Create `helper/src/validators/provider.validator.ts`**

```typescript
import { z } from 'zod';
import { TransactionType, BetType, GameRoundStatus } from '../types/provider.types';

const betOutcomeWinSchema = z.object({
  amount: z.string(),
  awardType: z.string(),
  id: z.string(),
  type: z.string().optional()
});

export const betOutcomeEventDataSchema = z.object({
  jackpotWins: z.array(betOutcomeWinSchema).optional(),
  tournamentWins: z.array(betOutcomeWinSchema).optional(),
  campaignWins: z.array(betOutcomeWinSchema).optional(),
  cashBonusWins: z.array(betOutcomeWinSchema).optional(),
  reversalOfType: z.string().optional()
}).optional();

export const providerBalanceRequestSchema = z.object({
  token: z.string(),
  providerGameId: z.string().optional(),
  providerName: z.string().optional(),
  timestamp: z.number().int(),
  playerId: z.string().regex(/^\d+$/, 'playerId must be a numeric string')
});

export const providerTransactionRequestSchema = z.object({
  transactionType: z.nativeEnum(TransactionType),
  betType: z.nativeEnum(BetType),
  gameRoundStatus: z.nativeEnum(GameRoundStatus),
  providerGameId: z.string().optional(),
  providerName: z.string().optional(),
  timestamp: z.number().int(),
  playerId: z.string().regex(/^\d+$/, 'playerId must be a numeric string'),
  token: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/, 'amount must be a numeric string'),
  currency: z.string().length(3).optional(),
  providerGameRoundId: z.string(),
  providerTransactionId: z.string(),
  betOutcomeEventData: betOutcomeEventDataSchema
});
```

- [ ] **Step 2: Export from `helper/src/validators/index.ts`**

Add to the existing exports:
```typescript
export * from './provider.validator';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Programacion\Casino\bets-online
pnpm --filter helper type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add helper/src/validators/
git commit -m "feat(helper): add Zod validators for 21Viral provider requests"
```

---

## Chunk 2: Database — migrations and Sequelize models

### Files
- Create: `api/src/persistence/migrations/20260319000001-create-user-provider-profiles.js`
- Create: `api/src/persistence/migrations/20260319000002-create-provider-transactions.js`
- Create: `api/src/persistence/models/UserProviderProfile.model.ts`
- Create: `api/src/persistence/models/ProviderTransaction.model.ts`
- Modify: `api/src/persistence/models/index.ts` (export new models)

---

### Task 4: Migration — user_provider_profiles

- [ ] **Step 1: Create migration file**

Create `api/src/persistence/migrations/20260319000001-create-user-provider-profiles.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_provider_profiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      provider_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      provider_player_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'ARS'
      },
      country_code: {
        type: Sequelize.STRING(2),
        allowNull: false,
        defaultValue: 'AR'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('user_provider_profiles', ['user_id', 'provider_name'], {
      unique: true,
      name: 'uq_user_provider_profiles_user_provider'
    });

    await queryInterface.addIndex('user_provider_profiles', ['provider_name', 'provider_player_id'], {
      unique: true,
      name: 'uq_user_provider_profiles_provider_player'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_provider_profiles');
  }
};
```

- [ ] **Step 2: Run migration**

```bash
cd C:\Programacion\Casino\bets-online
pnpm --filter api migration:run
```

Expected: `20260319000001-create-user-provider-profiles: migrated` in output.

- [ ] **Step 3: Commit**

```bash
git add api/src/persistence/migrations/20260319000001-create-user-provider-profiles.js
git commit -m "feat(db): add user_provider_profiles migration"
```

---

### Task 5: Migration — provider_transactions

- [ ] **Step 1: Create migration file**

Create `api/src/persistence/migrations/20260319000002-create-provider-transactions.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      provider_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      provider_transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      provider_game_round_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      provider_game_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      provider_player_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      transaction_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      bet_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      game_round_status: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(15, 4),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false
      },
      balance_after: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      bet_outcome_event_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id', 'transaction_type'],
      {
        unique: true,
        name: 'uq_provider_transactions_idempotency'
      }
    );

    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id'],
      {
        name: 'idx_provider_tx_reversal_lookup'
      }
    );

    await queryInterface.addIndex('provider_transactions', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('provider_transactions');
  }
};
```

- [ ] **Step 2: Run migration**

```bash
pnpm --filter api migration:run
```

Expected: `20260319000002-create-provider-transactions: migrated`.

- [ ] **Step 3: Commit**

```bash
git add api/src/persistence/migrations/20260319000002-create-provider-transactions.js
git commit -m "feat(db): add provider_transactions migration"
```

---

### Task 6: Sequelize model — UserProviderProfile

- [ ] **Step 1: Create `api/src/persistence/models/UserProviderProfile.model.ts`**

```typescript
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class UserProviderProfileModel extends Model {
  declare id: string;
  declare userId: string;
  declare providerName: string;
  declare providerPlayerId: string;
  declare currency: string;
  declare countryCode: string;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

UserProviderProfileModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    providerName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'provider_name'
    },
    providerPlayerId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_player_id'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ARS',
      field: 'currency'
    },
    countryCode: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'AR',
      field: 'country_code'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'user_provider_profiles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default UserProviderProfileModel;
```

- [ ] **Step 2: Create `api/src/persistence/models/ProviderTransaction.model.ts`**

```typescript
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { TransactionType, BetType, GameRoundStatus, BetOutcomeEventData } from 'helper';

export class ProviderTransactionModel extends Model {
  declare id: string;
  declare providerName: string;
  declare providerTransactionId: string;
  declare providerGameRoundId: string | null;
  declare providerGameId: string | null;
  declare providerPlayerId: string;
  declare userId: string;
  declare transactionType: TransactionType;
  declare betType: BetType | null;
  declare gameRoundStatus: GameRoundStatus | null;
  declare amount: string;
  declare currency: string;
  declare balanceAfter: string;
  declare betOutcomeEventData: BetOutcomeEventData | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ProviderTransactionModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    providerName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'provider_name'
    },
    providerTransactionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_transaction_id'
    },
    providerGameRoundId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_game_round_id'
    },
    providerGameId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_game_id'
    },
    providerPlayerId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_player_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    transactionType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'transaction_type'
    },
    betType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'bet_type'
    },
    gameRoundStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'game_round_status'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      field: 'amount'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      field: 'currency'
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'balance_after'
    },
    betOutcomeEventData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'bet_outcome_event_data'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'provider_transactions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default ProviderTransactionModel;
```

- [ ] **Step 3: Export models from `api/src/persistence/models/index.ts`**

Add these exports to the existing index.ts:
```typescript
export { UserProviderProfileModel } from './UserProviderProfile.model';
export { ProviderTransactionModel } from './ProviderTransaction.model';
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter api type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add api/src/persistence/models/
git commit -m "feat(db): add UserProviderProfile and ProviderTransaction Sequelize models"
```

---

## Chunk 3: Repositories

### Files
- Create: `api/src/persistence/repositories/userProviderProfile.repository.ts`
- Create: `api/src/persistence/repositories/providerTransaction.repository.ts`
- Modify: `api/src/persistence/repositories/balances.repository.ts` (add transaction-aware method)
- Modify: `api/src/persistence/repositories/index.ts` (export new repos)

---

### Task 7: UserProviderProfile repository

- [ ] **Step 1: Write the failing test**

Create `api/tests/repositories/userProviderProfile.repository.test.ts`:

```typescript
import { UserProviderProfileRepository } from '../../src/persistence/repositories/userProviderProfile.repository';

describe('UserProviderProfileRepository', () => {
  const repo = new UserProviderProfileRepository();

  describe('findByProviderPlayerId', () => {
    it('should return null when profile does not exist', async () => {
      const result = await repo.findByProviderPlayerId('21viral', '99999999');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Programacion\Casino\bets-online
pnpm --filter api test -- --testPathPattern="userProviderProfile.repository"
```

Expected: FAIL — `UserProviderProfileRepository` not found.

- [ ] **Step 3: Create `api/src/persistence/repositories/userProviderProfile.repository.ts`**

```typescript
import { Transaction } from 'sequelize';
import { UserProviderProfileModel } from '../models/UserProviderProfile.model';
import { UserProviderProfile } from 'helper';

export class UserProviderProfileRepository {
  async findByProviderPlayerId(
    providerName: string,
    providerPlayerId: string,
    transaction?: Transaction
  ): Promise<UserProviderProfile | null> {
    const profile = await UserProviderProfileModel.findOne({
      where: { providerName, providerPlayerId },
      transaction
    });
    if (!profile) return null;
    return this.mapToProfile(profile);
  }

  async findByUserId(
    userId: string,
    providerName: string,
    transaction?: Transaction
  ): Promise<UserProviderProfile | null> {
    const profile = await UserProviderProfileModel.findOne({
      where: { userId, providerName },
      transaction
    });
    if (!profile) return null;
    return this.mapToProfile(profile);
  }

  async create(data: {
    userId: string;
    providerName: string;
    providerPlayerId: string;
    currency?: string;
    countryCode?: string;
  }, transaction?: Transaction): Promise<UserProviderProfile> {
    const profile = await UserProviderProfileModel.create(
      {
        userId: data.userId,
        providerName: data.providerName,
        providerPlayerId: data.providerPlayerId,
        currency: data.currency ?? 'ARS',
        countryCode: data.countryCode ?? 'AR',
        isActive: true
      },
      { transaction }
    );
    return this.mapToProfile(profile);
  }

  private mapToProfile(model: UserProviderProfileModel): UserProviderProfile {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      providerName: plain.providerName,
      providerPlayerId: plain.providerPlayerId,
      currency: plain.currency,
      countryCode: plain.countryCode,
      isActive: plain.isActive,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const userProviderProfileRepository = new UserProviderProfileRepository();
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- --testPathPattern="userProviderProfile.repository"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/persistence/repositories/userProviderProfile.repository.ts api/tests/repositories/userProviderProfile.repository.test.ts
git commit -m "feat: add UserProviderProfileRepository"
```

---

### Task 8: ProviderTransaction repository

- [ ] **Step 1: Write the failing test**

Create `api/tests/repositories/providerTransaction.repository.test.ts`:

```typescript
import { ProviderTransactionRepository } from '../../src/persistence/repositories/providerTransaction.repository';
import { TransactionType } from 'helper';

describe('ProviderTransactionRepository', () => {
  const repo = new ProviderTransactionRepository();

  describe('findByIdempotencyKey', () => {
    it('should return null when transaction does not exist', async () => {
      const result = await repo.findByIdempotencyKey(
        '21viral',
        'non-existent-tx-id',
        TransactionType.Debit
      );
      expect(result).toBeNull();
    });
  });

  describe('findOriginalForReversal', () => {
    it('should return null when no Debit/Credit found for given id', async () => {
      const result = await repo.findOriginalForReversal('21viral', 'non-existent-tx-id');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- --testPathPattern="providerTransaction.repository"
```

Expected: FAIL — `ProviderTransactionRepository` not found.

- [ ] **Step 3: Create `api/src/persistence/repositories/providerTransaction.repository.ts`**

```typescript
import { Transaction, Op } from 'sequelize';
import { ProviderTransactionModel } from '../models/ProviderTransaction.model';
import { ProviderTransaction, TransactionType, BetType, GameRoundStatus, BetOutcomeEventData } from 'helper';

export class ProviderTransactionRepository {
  async findByIdempotencyKey(
    providerName: string,
    providerTransactionId: string,
    transactionType: TransactionType,
    transaction?: Transaction
  ): Promise<ProviderTransaction | null> {
    const tx = await ProviderTransactionModel.findOne({
      where: { providerName, providerTransactionId, transactionType },
      transaction
    });
    if (!tx) return null;
    return this.mapToProviderTransaction(tx);
  }

  // Used in Reversal flow: finds the original Debit or Credit to be reversed
  async findOriginalForReversal(
    providerName: string,
    providerTransactionId: string,
    transaction?: Transaction
  ): Promise<ProviderTransaction | null> {
    const tx = await ProviderTransactionModel.findOne({
      where: {
        providerName,
        providerTransactionId,
        transactionType: { [Op.in]: [TransactionType.Debit, TransactionType.Credit] }
      },
      transaction
    });
    if (!tx) return null;
    return this.mapToProviderTransaction(tx);
  }

  async create(data: {
    providerName: string;
    providerTransactionId: string;
    providerGameRoundId?: string | null;
    providerGameId?: string | null;
    providerPlayerId: string;
    userId: string;
    transactionType: TransactionType;
    betType?: BetType | null;
    gameRoundStatus?: GameRoundStatus | null;
    amount: string;
    currency: string;
    balanceAfter: string;
    betOutcomeEventData?: BetOutcomeEventData | null;
  }, transaction?: Transaction): Promise<ProviderTransaction> {
    const tx = await ProviderTransactionModel.create(
      {
        providerName: data.providerName,
        providerTransactionId: data.providerTransactionId,
        providerGameRoundId: data.providerGameRoundId ?? null,
        providerGameId: data.providerGameId ?? null,
        providerPlayerId: data.providerPlayerId,
        userId: data.userId,
        transactionType: data.transactionType,
        betType: data.betType ?? null,
        gameRoundStatus: data.gameRoundStatus ?? null,
        amount: data.amount,
        currency: data.currency,
        balanceAfter: data.balanceAfter,
        betOutcomeEventData: data.betOutcomeEventData ?? null
      },
      { transaction }
    );
    return this.mapToProviderTransaction(tx);
  }

  private mapToProviderTransaction(model: ProviderTransactionModel): ProviderTransaction {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      providerName: plain.providerName,
      providerTransactionId: plain.providerTransactionId,
      providerGameRoundId: plain.providerGameRoundId,
      providerGameId: plain.providerGameId,
      providerPlayerId: plain.providerPlayerId,
      userId: plain.userId,
      transactionType: plain.transactionType as TransactionType,
      betType: plain.betType as BetType | null,
      gameRoundStatus: plain.gameRoundStatus as GameRoundStatus | null,
      amount: String(plain.amount),
      currency: plain.currency,
      balanceAfter: String(plain.balanceAfter),
      betOutcomeEventData: plain.betOutcomeEventData,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const providerTransactionRepository = new ProviderTransactionRepository();
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter api test -- --testPathPattern="providerTransaction.repository"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/persistence/repositories/providerTransaction.repository.ts api/tests/repositories/providerTransaction.repository.test.ts
git commit -m "feat: add ProviderTransactionRepository"
```

---

### Task 9: Update BalancesRepository for transaction support

The existing `BalancesRepository` performs balance reads and writes without accepting a Sequelize `Transaction` parameter. This breaks atomicity when called from within a DB transaction. We add a new transaction-aware method `updateChipBalance`.

- [ ] **Step 1: Write the failing test**

Add to `api/tests/repositories/balances.repository.test.ts` (create if not exists):

```typescript
import { BalancesRepository } from '../../src/persistence/repositories/balances.repository';

describe('BalancesRepository.updateChipBalance', () => {
  it('should export updateChipBalance method', () => {
    const repo = new BalancesRepository();
    expect(typeof repo.updateChipBalance).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- --testPathPattern="balances.repository"
```

Expected: FAIL — `updateChipBalance` not a function.

- [ ] **Step 3: Add `updateChipBalance` to `api/src/persistence/repositories/balances.repository.ts`**

Add this method to the existing `BalancesRepository` class (do NOT remove or change existing methods):

```typescript
import { Transaction } from 'sequelize'; // add to existing imports

// Add this method inside the class:
async updateChipBalance(
  userId: string,
  newBalance: string,
  transaction?: Transaction
): Promise<void> {
  const balance = await BalanceModel.findOne({
    where: { userId },
    transaction,
    lock: transaction ? true : undefined  // SELECT FOR UPDATE when inside transaction
  });

  if (!balance) {
    throw new Error('Balance not found');
  }

  await balance.update(
    {
      chipBalance: parseFloat(newBalance),
      lastUpdatedAt: new Date()
    },
    { transaction }
  );
}

async findByUserIdWithLock(
  userId: string,
  transaction: Transaction
): Promise<Balance | null> {
  const balance = await BalanceModel.findOne({
    where: { userId },
    transaction,
    lock: true  // SELECT FOR UPDATE
  });
  if (!balance) return null;
  return this.mapToBalance(balance);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter api test -- --testPathPattern="balances.repository"
```

Expected: PASS.

- [ ] **Step 5: Export new repos from `api/src/persistence/repositories/index.ts`**

Add to the existing index:
```typescript
export { userProviderProfileRepository, UserProviderProfileRepository } from './userProviderProfile.repository';
export { providerTransactionRepository, ProviderTransactionRepository } from './providerTransaction.repository';
```

- [ ] **Step 6: Commit**

```bash
git add api/src/persistence/repositories/
git commit -m "feat: add transaction-aware balance update and new provider repositories"
```

---

## Chunk 4: HMAC Middleware

### Files
- Create: `api/src/middleware/hmac.middleware.ts`
- Create: `api/tests/middleware/hmac.middleware.test.ts`

---

### Task 10: HMAC middleware

- [ ] **Step 1: Write the failing tests**

Create `api/tests/middleware/hmac.middleware.test.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createHmacMiddleware } from '../../src/middleware/hmac.middleware';

// Helper: canonicalize JSON per RFC 8785
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  return `{${sorted.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function makeSignature(secret: string, body: object): string {
  const canonical = canonicalize(body);
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

const config = {
  username: 'test-user',
  secretKey: 'test-secret',
  providerName: '21viral',
  timestampToleranceSeconds: 300
};

const middleware = createHmacMiddleware(config);

function mockReqRes(body: object, authHeader?: string) {
  const req = { body, headers: { authorization: authHeader } } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('createHmacMiddleware', () => {
  const validBody = { playerId: '1', timestamp: Math.floor(Date.now() / 1000) };

  it('should call next() when signature is valid', () => {
    const sig = makeSignature(config.secretKey, validBody);
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 ${config.username}:${sig}`);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header is missing', () => {
    const { req, res, next } = mockReqRes(validBody);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when username does not match', () => {
    const sig = makeSignature(config.secretKey, validBody);
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 wrong-user:${sig}`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when signature is invalid', () => {
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 ${config.username}:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when timestamp is too old', () => {
    const oldBody = { playerId: '1', timestamp: Math.floor(Date.now() / 1000) - 400 };
    const sig = makeSignature(config.secretKey, oldBody);
    const { req, res, next } = mockReqRes(oldBody, `HMAC-SHA256 ${config.username}:${sig}`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when signature has wrong length (not 64 hex chars)', () => {
    const { req, res, next } = mockReqRes(validBody, `HMAC-SHA256 ${config.username}:tooshort`);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should include viralErrorCode AuthenticationFailure in error response', () => {
    const { req, res, next } = mockReqRes(validBody);
    middleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ viralErrorCode: 'AuthenticationFailure' })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter api test -- --testPathPattern="hmac.middleware"
```

Expected: FAIL — `createHmacMiddleware` not found.

- [ ] **Step 3: Create `api/src/middleware/hmac.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ViralErrorCode } from 'helper';

export interface HmacMiddlewareConfig {
  username: string;
  secretKey: string;
  providerName: string;
  timestampToleranceSeconds?: number;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  return `{${sorted.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function generateHmac(secretKey: string, canonicalBody: string): string {
  return crypto.createHmac('sha256', secretKey).update(canonicalBody, 'utf8').digest('hex');
}

function authFailure(res: Response, message: string) {
  return res.status(401).json({
    viralErrorCode: ViralErrorCode.AuthenticationFailure,
    message
  });
}

export const createHmacMiddleware = (config: HmacMiddlewareConfig) => {
  const tolerance = config.timestampToleranceSeconds ?? 300;

  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('HMAC-SHA256 ')) {
      authFailure(res, 'Missing or malformed Authorization header');
      return;
    }

    const [, credentials] = authHeader.split(' ');
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) {
      authFailure(res, 'Malformed Authorization header');
      return;
    }

    const username = credentials.substring(0, colonIndex);
    const receivedSignature = credentials.substring(colonIndex + 1);

    if (username !== config.username) {
      authFailure(res, 'Invalid authentication username');
      return;
    }

    // Validate timestamp within tolerance
    const timestamp = req.body?.timestamp;
    if (typeof timestamp !== 'number') {
      authFailure(res, 'Missing or invalid timestamp');
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > tolerance) {
      authFailure(res, 'Request timestamp out of tolerance window');
      return;
    }

    // Validate signature length before timingSafeEqual (SHA256 hex = 64 chars)
    const expectedSignature = generateHmac(config.secretKey, canonicalize(req.body));
    if (receivedSignature.length !== expectedSignature.length) {
      authFailure(res, 'Invalid signature length');
      return;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!isValid) {
      authFailure(res, 'Invalid HMAC signature');
      return;
    }

    next();
  };
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter api test -- --testPathPattern="hmac.middleware"
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/middleware/hmac.middleware.ts api/tests/middleware/hmac.middleware.test.ts
git commit -m "feat: add HMAC-SHA256 middleware with timestamp replay protection"
```

---

## Chunk 5: Balance domain, controller, and routes

### Files
- Create: `api/src/domain/integrations/21viral/balance.domain.ts`
- Create: `api/src/controllers/integrations/21viral/balance.controller.ts`
- Create: `api/src/routes/integrations/21viral/balance.routes.ts`
- Create: `api/src/routes/integrations/21viral/index.ts`
- Create: `api/tests/domain/integrations/balance.domain.test.ts`

---

### Task 11: Balance domain

- [ ] **Step 1: Write the failing tests**

Create `api/tests/domain/integrations/balance.domain.test.ts`:

```typescript
import { BalanceDomain } from '../../../src/domain/integrations/21viral/balance.domain';
import { ViralErrorCode } from 'helper';

// Mock repositories
jest.mock('../../../src/persistence/repositories/userProviderProfile.repository', () => ({
  userProviderProfileRepository: {
    findByProviderPlayerId: jest.fn()
  }
}));

jest.mock('../../../src/persistence/repositories/balances.repository', () => ({
  balancesRepository: {
    findByUserId: jest.fn()
  }
}));

jest.mock('../../../src/persistence/repositories/users.repository', () => ({
  usersRepository: {
    findById: jest.fn()
  }
}));

import { userProviderProfileRepository } from '../../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../../src/persistence/repositories/users.repository';

const domain = new BalanceDomain();

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  providerName: '21viral',
  providerPlayerId: '123',
  currency: 'ARS',
  countryCode: 'AR',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockUser = { id: 'user-1', status: 'ACTIVE', role: 'USER' };
const mockBalance = { id: 'bal-1', userId: 'user-1', chipBalance: 100.50, lastUpdatedAt: new Date() };

describe('BalanceDomain.getBalance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return formatted balance when all checks pass', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(mockProfile);
    (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);
    (balancesRepository.findByUserId as jest.Mock).mockResolvedValue(mockBalance);

    const result = await domain.getBalance({ token: 'tok', timestamp: 123, playerId: '123' });

    expect(result.balance).toBe('100.50');
    expect(result.currency).toBe('ARS');
  });

  it('should throw PlayerNotActive when profile not found', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(null);

    await expect(domain.getBalance({ token: 'tok', timestamp: 123, playerId: '999' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerNotActive });
  });

  it('should throw PlayerBlocked when user status is BLOCKED', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(mockProfile);
    (usersRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, status: 'BLOCKED' });

    await expect(domain.getBalance({ token: 'tok', timestamp: 123, playerId: '123' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerBlocked });
  });

  it('should throw PlayerNotActive when profile is_active is false', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue({ ...mockProfile, isActive: false });
    (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);

    await expect(domain.getBalance({ token: 'tok', timestamp: 123, playerId: '123' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerNotActive });
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
pnpm --filter api test -- --testPathPattern="balance.domain"
```

Expected: FAIL.

- [ ] **Step 3: Create `api/src/domain/integrations/21viral/balance.domain.ts`**

```typescript
import Decimal from 'decimal.js';
import {
  ProviderBalanceRequest,
  ProviderBalanceResponse,
  ViralErrorCode,
  UserStatus
} from 'helper';
import { userProviderProfileRepository } from '../../../persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../persistence/repositories/balances.repository';
import { usersRepository } from '../../../persistence/repositories/users.repository';

export class ViralError extends Error {
  constructor(public viralErrorCode: ViralErrorCode, message: string) {
    super(message);
    this.name = 'ViralError';
  }
}

export class BalanceDomain {
  async getBalance(req: ProviderBalanceRequest): Promise<ProviderBalanceResponse> {
    const profile = await userProviderProfileRepository.findByProviderPlayerId(
      '21viral',
      req.playerId
    );

    if (!profile) {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player profile not found');
    }

    const user = await usersRepository.findById(profile.userId);

    if (!user) {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'User not found');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ViralError(ViralErrorCode.PlayerBlocked, 'Player is blocked');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player is not active');
    }

    if (!profile.isActive) {
      throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player provider profile is inactive');
    }

    const balance = await balancesRepository.findByUserId(profile.userId);

    if (!balance) {
      throw new ViralError(ViralErrorCode.GeneralFailure, 'Balance record not found');
    }

    return {
      balance: new Decimal(balance.chipBalance).toFixed(2),
      currency: profile.currency
    };
  }
}

export const balanceDomain = new BalanceDomain();
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter api test -- --testPathPattern="balance.domain"
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/domain/integrations/ api/tests/domain/integrations/balance.domain.test.ts
git commit -m "feat: add BalanceDomain for 21Viral provider balance callback"
```

---

### Task 12: Balance controller and routes

- [ ] **Step 1: Create `api/src/controllers/integrations/21viral/balance.controller.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { providerBalanceRequestSchema, ViralErrorCode } from 'helper';
import { balanceDomain, ViralError } from '../../../domain/integrations/21viral/balance.domain';
import { ZodError } from 'zod';

export class BalanceController {
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = providerBalanceRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(422).json({
          viralErrorCode: ViralErrorCode.RequestValidationFailure,
          message: 'Request body validation failed',
        });
      }

      const result = await balanceDomain.getBalance(parsed.data);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ViralError) {
        const statusCode = error.viralErrorCode === ViralErrorCode.AuthenticationFailure ? 401 : 422;
        return res.status(statusCode).json({
          viralErrorCode: error.viralErrorCode,
          message: error.message
        });
      }
      return next(error);
    }
  }
}

export const balanceController = new BalanceController();
```

- [ ] **Step 2: Create `api/src/routes/integrations/21viral/balance.routes.ts`**

```typescript
import { Router } from 'express';
import { balanceController } from '../../../controllers/integrations/21viral/balance.controller';

const router = Router();

router.post('/balance', balanceController.getBalance.bind(balanceController));

export default router;
```

- [ ] **Step 3: Create `api/src/routes/integrations/21viral/index.ts`**

```typescript
import { Router } from 'express';
import balanceRoutes from './balance.routes';

const router = Router();

router.use('/players', balanceRoutes);

export default router;
```

- [ ] **Step 4: Commit**

```bash
git add api/src/controllers/integrations/ api/src/routes/integrations/
git commit -m "feat: add balance controller and routes for 21Viral integration"
```

---

## Chunk 6: Transactions domain, controller, and routes

### Files
- Create: `api/src/domain/integrations/21viral/transactions.domain.ts`
- Create: `api/src/controllers/integrations/21viral/transactions.controller.ts`
- Modify: `api/src/routes/integrations/21viral/index.ts` (add transactions routes)
- Create: `api/src/routes/integrations/21viral/transactions.routes.ts`
- Create: `api/tests/domain/integrations/transactions.domain.test.ts`

---

### Task 13: Transactions domain

- [ ] **Step 1: Write the failing tests**

Create `api/tests/domain/integrations/transactions.domain.test.ts`:

```typescript
import { TransactionsDomain } from '../../../src/domain/integrations/21viral/transactions.domain';
import { TransactionType, BetType, GameRoundStatus, ViralErrorCode } from 'helper';

jest.mock('../../../src/persistence/repositories/userProviderProfile.repository', () => ({
  userProviderProfileRepository: { findByProviderPlayerId: jest.fn() }
}));
jest.mock('../../../src/persistence/repositories/balances.repository', () => ({
  balancesRepository: {
    findByUserIdWithLock: jest.fn(),
    updateChipBalance: jest.fn()
  }
}));
jest.mock('../../../src/persistence/repositories/users.repository', () => ({
  usersRepository: { findById: jest.fn() }
}));
jest.mock('../../../src/persistence/repositories/providerTransaction.repository', () => ({
  providerTransactionRepository: {
    findByIdempotencyKey: jest.fn(),
    findOriginalForReversal: jest.fn(),
    create: jest.fn()
  }
}));
jest.mock('../../../src/config/sequelize', () => ({
  sequelize: {
    transaction: jest.fn((cb) => cb({ commit: jest.fn(), rollback: jest.fn() }))
  }
}));

import { userProviderProfileRepository } from '../../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../../src/persistence/repositories/users.repository';
import { providerTransactionRepository } from '../../../src/persistence/repositories/providerTransaction.repository';

const domain = new TransactionsDomain();

const mockProfile = {
  id: 'profile-1', userId: 'user-1', providerName: '21viral',
  providerPlayerId: '123', currency: 'ARS', countryCode: 'AR',
  isActive: true, createdAt: new Date(), updatedAt: new Date()
};
const mockUser = { id: 'user-1', status: 'ACTIVE', role: 'USER' };
const mockBalance = { id: 'bal-1', userId: 'user-1', chipBalance: 100.00, lastUpdatedAt: new Date() };
const mockCreatedTx = {
  id: 'tx-1', providerName: '21viral', providerTransactionId: 'ptx-001',
  transactionType: TransactionType.Debit, amount: '10.00', currency: 'ARS',
  balanceAfter: '90.00', providerPlayerId: '123', userId: 'user-1',
  providerGameRoundId: null, providerGameId: null, betType: null,
  gameRoundStatus: null, betOutcomeEventData: null, createdAt: new Date(), updatedAt: new Date()
};

const baseDebitReq = {
  transactionType: TransactionType.Debit,
  betType: BetType.Cash,
  gameRoundStatus: GameRoundStatus.Completed,
  playerId: '123',
  amount: '10.00',
  providerGameRoundId: 'round-1',
  providerTransactionId: 'ptx-001',
  timestamp: Math.floor(Date.now() / 1000)
};

describe('TransactionsDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(mockProfile);
    (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);
    (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue(mockBalance);
    (balancesRepository.updateChipBalance as jest.Mock).mockResolvedValue(undefined);
    (providerTransactionRepository.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
    (providerTransactionRepository.create as jest.Mock).mockResolvedValue(mockCreatedTx);
  });

  it('should process Debit and return updated balance', async () => {
    const result = await domain.processTransaction(baseDebitReq);
    expect(result.balance).toBe('90.00');
    expect(result.currency).toBe('ARS');
    expect(result.operatorTransactionId).toBe('tx-1');
    expect(result.alreadyProcessed).toBeUndefined();
  });

  it('should return alreadyProcessed: true for idempotent Debit', async () => {
    (providerTransactionRepository.findByIdempotencyKey as jest.Mock).mockResolvedValue(mockCreatedTx);
    const result = await domain.processTransaction(baseDebitReq);
    expect(result.alreadyProcessed).toBe(true);
    expect(balancesRepository.updateChipBalance).not.toHaveBeenCalled();
  });

  it('should throw InsufficientFunds when balance < amount', async () => {
    (balancesRepository.findByUserIdWithLock as jest.Mock).mockResolvedValue({ ...mockBalance, chipBalance: 5.00 });
    await expect(domain.processTransaction(baseDebitReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.InsufficientFunds });
  });

  it('should throw PlayerNotActive when profile not found', async () => {
    (userProviderProfileRepository.findByProviderPlayerId as jest.Mock).mockResolvedValue(null);
    await expect(domain.processTransaction(baseDebitReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.PlayerNotActive });
  });

  it('should throw CurrencyMismatch when request currency differs', async () => {
    await expect(domain.processTransaction({ ...baseDebitReq, currency: 'USD' }))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.CurrencyMismatch });
  });

  it('should throw DoubleTransactionWithDifferentAmount for same tx, different amount', async () => {
    (providerTransactionRepository.findByIdempotencyKey as jest.Mock).mockResolvedValue({ ...mockCreatedTx, amount: '20.00' });
    await expect(domain.processTransaction(baseDebitReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.DoubleTransactionWithDifferentAmount });
  });

  it('should process Credit and add to balance', async () => {
    const creditReq = { ...baseDebitReq, transactionType: TransactionType.Credit, providerTransactionId: 'ptx-002' };
    (providerTransactionRepository.create as jest.Mock).mockResolvedValue({ ...mockCreatedTx, transactionType: TransactionType.Credit, balanceAfter: '110.00' });
    const result = await domain.processTransaction(creditReq);
    expect(result.balance).toBe('110.00');
  });

  it('should process Reversal of Debit and restore balance', async () => {
    const originalDebit = { ...mockCreatedTx, transactionType: TransactionType.Debit, amount: '10.00', balanceAfter: '90.00' };
    (providerTransactionRepository.findOriginalForReversal as jest.Mock).mockResolvedValue(originalDebit);
    (providerTransactionRepository.create as jest.Mock).mockResolvedValue({ ...mockCreatedTx, transactionType: TransactionType.Reversal, balanceAfter: '100.00' });
    const reversalReq = { ...baseDebitReq, transactionType: TransactionType.Reversal, providerTransactionId: 'ptx-001' };
    const result = await domain.processTransaction(reversalReq);
    expect(result.balance).toBe('100.00');
  });

  it('should throw GameRoundNotFound for Reversal with no original tx', async () => {
    (providerTransactionRepository.findOriginalForReversal as jest.Mock).mockResolvedValue(null);
    const reversalReq = { ...baseDebitReq, transactionType: TransactionType.Reversal };
    await expect(domain.processTransaction(reversalReq))
      .rejects.toMatchObject({ viralErrorCode: ViralErrorCode.GameRoundNotFound });
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
pnpm --filter api test -- --testPathPattern="transactions.domain"
```

Expected: FAIL.

- [ ] **Step 3: Create `api/src/domain/integrations/21viral/transactions.domain.ts`**

```typescript
import Decimal from 'decimal.js';
import { Transaction } from 'sequelize';
import {
  ProviderTransactionRequest,
  ProviderTransactionResponse,
  ViralErrorCode,
  TransactionType,
  UserStatus
} from 'helper';
import { sequelize } from '../../../config/sequelize';
import { ViralError } from './balance.domain';
import { userProviderProfileRepository } from '../../../persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../persistence/repositories/balances.repository';
import { usersRepository } from '../../../persistence/repositories/users.repository';
import { providerTransactionRepository } from '../../../persistence/repositories/providerTransaction.repository';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export class TransactionsDomain {
  async processTransaction(req: ProviderTransactionRequest): Promise<ProviderTransactionResponse> {
    // 1. Find provider profile
    const profile = await userProviderProfileRepository.findByProviderPlayerId('21viral', req.playerId);
    if (!profile) throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player profile not found');

    // 2. Check user status
    const user = await usersRepository.findById(profile.userId);
    if (!user) throw new ViralError(ViralErrorCode.PlayerNotActive, 'User not found');
    if (user.status === UserStatus.BLOCKED) throw new ViralError(ViralErrorCode.PlayerBlocked, 'Player is blocked');
    if (user.status !== UserStatus.ACTIVE) throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player is not active');

    // 3. Check is_active
    if (!profile.isActive) throw new ViralError(ViralErrorCode.PlayerNotActive, 'Player provider profile is inactive');

    // 4. Check currency mismatch
    if (req.currency && req.currency !== profile.currency) {
      throw new ViralError(ViralErrorCode.CurrencyMismatch, `Currency mismatch: expected ${profile.currency}, got ${req.currency}`);
    }

    // 5. Idempotency check (outside transaction — read-only)
    const existing = await providerTransactionRepository.findByIdempotencyKey(
      '21viral',
      req.providerTransactionId,
      req.transactionType
    );

    if (existing) {
      if (new Decimal(existing.amount).equals(new Decimal(req.amount))) {
        return {
          balance: existing.balanceAfter,
          currency: profile.currency,
          operatorTransactionId: existing.id,
          alreadyProcessed: true
        };
      }
      throw new ViralError(
        ViralErrorCode.DoubleTransactionWithDifferentAmount,
        'Same transaction ID with different amount'
      );
    }

    // 6. Execute inside DB transaction
    try {
      return await sequelize.transaction(async (t: Transaction) => {
        return this.executeTransaction(req, profile, t);
      });
    } catch (error: unknown) {
      // Race condition: unique constraint violation — another request already processed this tx
      if (
        error &&
        typeof error === 'object' &&
        'parent' in error &&
        (error as { parent: { code: string } }).parent?.code === POSTGRES_UNIQUE_VIOLATION
      ) {
        const existingAfterRace = await providerTransactionRepository.findByIdempotencyKey(
          '21viral',
          req.providerTransactionId,
          req.transactionType
        );
        if (existingAfterRace) {
          return {
            balance: existingAfterRace.balanceAfter,
            currency: profile.currency,
            operatorTransactionId: existingAfterRace.id,
            alreadyProcessed: true
          };
        }
      }
      throw error;
    }
  }

  private async executeTransaction(
    req: ProviderTransactionRequest,
    profile: { userId: string; providerPlayerId: string; currency: string },
    t: Transaction
  ): Promise<ProviderTransactionResponse> {
    const balance = await balancesRepository.findByUserIdWithLock(profile.userId, t);
    if (!balance) throw new ViralError(ViralErrorCode.GeneralFailure, 'Balance not found');

    const currentBalance = new Decimal(balance.chipBalance);
    const amount = new Decimal(req.amount);
    let newBalance: Decimal;

    if (req.transactionType === TransactionType.Debit) {
      if (currentBalance.lessThan(amount)) {
        throw new ViralError(ViralErrorCode.InsufficientFunds, 'Insufficient balance');
      }
      newBalance = currentBalance.minus(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    } else if (req.transactionType === TransactionType.Credit) {
      newBalance = currentBalance.plus(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    } else {
      // REVERSAL
      const original = await providerTransactionRepository.findOriginalForReversal(
        '21viral',
        req.providerTransactionId,
        t
      );

      if (!original) throw new ViralError(ViralErrorCode.GameRoundNotFound, 'Original transaction not found');

      const originalAmount = new Decimal(original.amount);

      if (original.transactionType === TransactionType.Debit) {
        newBalance = currentBalance.plus(originalAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      } else {
        // Credit reversal — clamp to 0
        newBalance = Decimal.max(
          currentBalance.minus(originalAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
          new Decimal(0)
        );
      }
    }

    const newBalanceStr = newBalance.toFixed(2);

    await balancesRepository.updateChipBalance(profile.userId, newBalanceStr, t);

    const tx = await providerTransactionRepository.create(
      {
        providerName: '21viral',
        providerTransactionId: req.providerTransactionId,
        providerGameRoundId: req.providerGameRoundId ?? null,
        providerGameId: req.providerGameId ?? null,
        providerPlayerId: profile.providerPlayerId,
        userId: profile.userId,
        transactionType: req.transactionType,
        betType: req.betType ?? null,
        gameRoundStatus: req.gameRoundStatus ?? null,
        amount: req.amount,
        currency: req.currency ?? profile.currency,
        balanceAfter: newBalanceStr,
        betOutcomeEventData: req.betOutcomeEventData ?? null
      },
      t
    );

    return {
      balance: newBalanceStr,
      currency: profile.currency,
      operatorTransactionId: tx.id
    };
  }
}

export const transactionsDomain = new TransactionsDomain();
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter api test -- --testPathPattern="transactions.domain"
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/domain/integrations/21viral/transactions.domain.ts api/tests/domain/integrations/transactions.domain.test.ts
git commit -m "feat: add TransactionsDomain for 21Viral Debit/Credit/Reversal callbacks"
```

---

### Task 14: Transactions controller and routes

- [ ] **Step 1: Create `api/src/controllers/integrations/21viral/transactions.controller.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { providerTransactionRequestSchema, ViralErrorCode } from 'helper';
import { transactionsDomain, ViralError } from '../../../domain/integrations/21viral/transactions.domain';

export class TransactionsController {
  async processTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = providerTransactionRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(422).json({
          viralErrorCode: ViralErrorCode.RequestValidationFailure,
          message: 'Request body validation failed'
        });
      }

      const result = await transactionsDomain.processTransaction(parsed.data);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ViralError) {
        const statusCode = error.viralErrorCode === ViralErrorCode.AuthenticationFailure ? 401 : 422;
        return res.status(statusCode).json({
          viralErrorCode: error.viralErrorCode,
          message: error.message
        });
      }
      return next(error);
    }
  }
}

export const transactionsController = new TransactionsController();
```

- [ ] **Step 2: Create `api/src/routes/integrations/21viral/transactions.routes.ts`**

```typescript
import { Router } from 'express';
import { transactionsController } from '../../../controllers/integrations/21viral/transactions.controller';

const router = Router();

router.post('/transactions', transactionsController.processTransaction.bind(transactionsController));

export default router;
```

- [ ] **Step 3: Update `api/src/routes/integrations/21viral/index.ts`**

```typescript
import { Router } from 'express';
import balanceRoutes from './balance.routes';
import transactionsRoutes from './transactions.routes';

const router = Router();

router.use('/players', balanceRoutes);
router.use('/players', transactionsRoutes);

export default router;
```

- [ ] **Step 4: Commit**

```bash
git add api/src/controllers/integrations/21viral/transactions.controller.ts api/src/routes/integrations/21viral/
git commit -m "feat: add transactions controller and routes for 21Viral integration"
```

---

## Chunk 7: Server integration and final tests

### Files
- Modify: `api/src/server.ts`
- Create: `api/tests/integration/21viral.integration.test.ts`

---

### Task 15: Mount routes in server.ts

- [ ] **Step 1: Update `api/src/server.ts`**

Add after the existing `app.use('/api', routes)` line:

```typescript
import viral21Routes from './routes/integrations/21viral';
import { createHmacMiddleware } from './middleware/hmac.middleware';

// 21Viral provider callback routes (HMAC authenticated, no JWT)
app.use(
  '/api/integrations/21viral',
  createHmacMiddleware({
    username: config.viral.username,
    secretKey: config.viral.secretKey,
    providerName: '21viral'
  }),
  viral21Routes
);
```

- [ ] **Step 2: Add viral config to `api/src/config/index.ts`**

Add to the existing config object:
```typescript
viral: {
  username: process.env.VIRAL_USERNAME ?? '',
  secretKey: process.env.VIRAL_SECRET_KEY ?? '',
  integratorUrl: process.env.INTEGRATOR_URL ?? ''
}
```

- [ ] **Step 3: Type-check the whole api**

```bash
pnpm --filter api type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/server.ts api/src/config/
git commit -m "feat: mount 21Viral integration routes in server"
```

---

### Task 16: Integration tests

- [ ] **Step 1: Create `api/tests/integration/21viral.integration.test.ts`**

```typescript
import request from 'supertest';
import crypto from 'crypto';
import app from '../../src/server';

// Canonicalize per RFC 8785
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function makeAuthHeader(body: object): string {
  const username = process.env.VIRAL_USERNAME ?? 'arenabet';
  const secret = process.env.VIRAL_SECRET_KEY ?? '961b4ec6c03ef309663ad3f840fa527e283a3ac5479b994913a721dc30a78f4d';
  const sig = crypto.createHmac('sha256', secret).update(canonicalize(body), 'utf8').digest('hex');
  return `HMAC-SHA256 ${username}:${sig}`;
}

const now = () => Math.floor(Date.now() / 1000);

describe('21Viral Integration — HMAC Authentication', () => {
  it('should return 401 with AuthenticationFailure when no Authorization header', async () => {
    const body = { token: 'tok', playerId: '1', timestamp: now() };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.viralErrorCode).toBe('AuthenticationFailure');
  });

  it('should return 401 when signature is wrong', async () => {
    const body = { token: 'tok', playerId: '1', timestamp: now() };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .set('Authorization', 'HMAC-SHA256 arenabet:wrongsignaturedeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('should return 401 when timestamp is expired', async () => {
    const body = { token: 'tok', playerId: '1', timestamp: now() - 400 };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(401);
  });
});

describe('21Viral Integration — Balance endpoint', () => {
  it('should return 422 PlayerNotActive for unknown playerId', async () => {
    const body = { token: 'tok', playerId: '99999', timestamp: now() };
    const res = await request(app)
      .post('/api/integrations/21viral/players/balance')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(422);
    expect(res.body.viralErrorCode).toBe('PlayerNotActive');
  });
});

describe('21Viral Integration — Transactions endpoint', () => {
  it('should return 422 PlayerNotActive for unknown playerId', async () => {
    const body = {
      transactionType: 'Debit',
      betType: 'Cash',
      gameRoundStatus: 'Completed',
      playerId: '99999',
      amount: '1.00',
      providerGameRoundId: 'r1',
      providerTransactionId: 'tx-test-1',
      timestamp: now()
    };
    const res = await request(app)
      .post('/api/integrations/21viral/players/transactions')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(422);
    expect(res.body.viralErrorCode).toBe('PlayerNotActive');
  });

  it('should return 422 RequestValidationFailure for invalid transactionType', async () => {
    const body = {
      transactionType: 'InvalidType',
      betType: 'Cash',
      gameRoundStatus: 'Completed',
      playerId: '1',
      amount: '1.00',
      providerGameRoundId: 'r1',
      providerTransactionId: 'tx-test-2',
      timestamp: now()
    };
    const res = await request(app)
      .post('/api/integrations/21viral/players/transactions')
      .set('Authorization', makeAuthHeader(body))
      .send(body);
    expect(res.status).toBe(422);
    expect(res.body.viralErrorCode).toBe('RequestValidationFailure');
  });
});
```

- [ ] **Step 2: Run integration tests**

```bash
pnpm --filter api test -- --testPathPattern="21viral.integration"
```

Expected: All tests that check HMAC and validation pass. Tests that need a real DB player (PlayerNotActive) may fail if DB is not seeded — that's acceptable for CI; they require a real staging test user.

- [ ] **Step 3: Run full test suite**

```bash
pnpm --filter api test
```

Expected: all tests pass (`--passWithNoTests` is configured so any skipped tests are OK).

- [ ] **Step 4: Run type-check and lint**

```bash
pnpm --filter api type-check
pnpm --filter api lint
```

Expected: no errors.

- [ ] **Step 5: Final commit**

```bash
git add api/tests/integration/21viral.integration.test.ts
git commit -m "test: add 21Viral integration tests for HMAC and endpoint validation"
```

- [ ] **Step 6: Push branch**

```bash
git push -u origin feature/provider-callbacks
```

---

## Summary

| Chunk | Tasks | Commits |
|-------|-------|---------|
| 1 — Foundation | 1-3 | env vars, decimal.js, types, validators |
| 2 — Database | 4-6 | 2 migrations, 2 models |
| 3 — Repositories | 7-9 | UserProviderProfile, ProviderTransaction, BalancesRepository update |
| 4 — HMAC Middleware | 10 | middleware with timestamp + length guards |
| 5 — Balance | 11-12 | domain, controller, routes |
| 6 — Transactions | 13-14 | domain (Debit/Credit/Reversal + idempotency), controller, routes |
| 7 — Integration | 15-16 | server mount, integration tests |

**Total: 16 tasks, ~20 commits**

After this branch is merged, the next branches are:
- `feature/game-catalog` — sync game catalog from 21Viral `POST /v1/games`
- `feature/game-launch-iframe` — frontend launch with iframe + postMessage
