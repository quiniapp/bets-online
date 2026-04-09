# Unified Transactions & Game Sync Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the platform with four capabilities: (1) a cron job that keeps provider games in sync every 12 h, (2) a unified transaction ledger so player game activity appears in `chip_movements` alongside deposits/withdrawals, (3) admin UI improvements for games and provider transactions, and (4) updated player transaction history to show game activity.

**Architecture:** `chip_movements` is already the canonical ledger for the player-facing transaction history. We extend its `type` ENUM with `GAME_BET | GAME_WIN | GAME_REFUND` and dual-write a `chip_movement` record inside the same DB transaction that creates the `provider_transaction`. The cron job calls the existing `gameLaunchDomain.syncGames()` domain method on a schedule. Admin and player UI pages are updated to surface the new data.

**Tech Stack:** TypeScript, Express, Sequelize, PostgreSQL, node-cron, Next.js App Router, shadcn/ui

---

## File Map

| Action | Path |
|--------|------|
| Create | `api/src/cron/gameSyncJob.ts` |
| Modify | `api/src/server.ts` — start cron after DB connects |
| Create | `api/src/persistence/migrations/20260408000003-add-game-chip-movement-types.js` |
| Modify | `helper/src/types/enums.types.ts` — add `GAME_BET`, `GAME_WIN`, `GAME_REFUND` |
| Modify | `api/src/persistence/repositories/chip-movements.repository.ts` — add optional `Transaction` param to `create()` |
| Modify | `api/src/domain/integrations/21viral/transactions.domain.ts` — dual-write chip_movement |
| Create | `api/tests/domain/integrations/transactions.domain.test.ts` — tests for dual-write |
| Modify | `api/src/controllers/games.controller.ts` — add `syncGames` action |
| Modify | `api/src/routes/integrations/21viral/gameLaunch.routes.ts` — add sync route |
| Modify | `web/app/admin/games/page.tsx` — thumbnail, provider badge, manual sync button |
| Create | `api/src/routes/admin/providerTransactions.routes.ts` |
| Create | `api/src/controllers/admin/providerTransactions.controller.ts` |
| Create | `api/src/routes/admin/index.ts` |
| Modify | `api/src/routes/index.ts` — mount admin routes |
| Create | `web/hooks/useProviderTransactions.ts` |
| Create | `web/app/admin/provider-transactions/page.tsx` |
| Modify | `web/app/user/transactions/page.tsx` — add GAME_BET/GAME_WIN/GAME_REFUND labels |

---

## Task 1: 12-hour game sync cron job

**Files:**
- Create: `api/src/cron/gameSyncJob.ts`
- Modify: `api/src/server.ts`

- [ ] **Step 1: Install node-cron**

```bash
cd api && pnpm add node-cron && pnpm add -D @types/node-cron
```

Expected output: packages added to `api/package.json`.

- [ ] **Step 2: Create the cron job module**

```typescript
// api/src/cron/gameSyncJob.ts
import cron from 'node-cron';
import { gameLaunchDomain } from '../domain/integrations/21viral/gameLaunch.domain';

export function startGameSyncJob(): void {
  // Runs at minute 0 of every 12th hour: 00:00 and 12:00
  cron.schedule('0 */12 * * *', async () => {
    console.log('[GameSync] Starting scheduled game sync…');
    try {
      const result = await gameLaunchDomain.syncGames();
      console.log(`[GameSync] Synced ${result.synced} games`);
    } catch (err) {
      console.error('[GameSync] Sync failed:', err);
    }
  });
  console.log('[GameSync] Cron job registered (every 12 h)');
}
```

- [ ] **Step 3: Start the cron in server.ts after DB connects**

In `api/src/server.ts`, import and call `startGameSyncJob()` inside `startServer()` after `testConnection()` succeeds:

```typescript
import { startGameSyncJob } from './cron/gameSyncJob';
```

```typescript
const startServer = async () => {
  try {
    await testConnection();
    startGameSyncJob();          // <-- add this line

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      // ... rest unchanged
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd api && pnpm type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd api && git add src/cron/gameSyncJob.ts src/server.ts package.json pnpm-lock.yaml
git commit -m "feat: add 12h cron job for provider game sync"
```

---

## Task 2: DB migration — add GAME_BET / GAME_WIN / GAME_REFUND to chip_movements ENUM

**Files:**
- Create: `api/src/persistence/migrations/20260408000003-add-game-chip-movement-types.js`

Context: PostgreSQL ENUM values are added with `ALTER TYPE … ADD VALUE`. They cannot be removed without recreating the type, so the `down` migration is intentionally a no-op (the values are safe to leave).

- [ ] **Step 1: Create the migration file**

```javascript
// api/src/persistence/migrations/20260408000003-add-game-chip-movement-types.js
'use strict';

module.exports = {
  async up(queryInterface) {
    // ADD VALUE cannot run inside a transaction in PostgreSQL
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_chip_movements_type\" ADD VALUE IF NOT EXISTS 'GAME_BET'"
    );
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_chip_movements_type\" ADD VALUE IF NOT EXISTS 'GAME_WIN'"
    );
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_chip_movements_type\" ADD VALUE IF NOT EXISTS 'GAME_REFUND'"
    );
  },

  async down() {
    // PostgreSQL does not support removing ENUM values.
    // The values are harmless to leave in place.
    console.warn('down: GAME_BET/GAME_WIN/GAME_REFUND ENUM values cannot be removed automatically');
  }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd api && npx sequelize-cli db:migrate
```

Expected: migration `20260408000003-add-game-chip-movement-types` applied.

- [ ] **Step 3: Commit**

```bash
git add api/src/persistence/migrations/20260408000003-add-game-chip-movement-types.js
git commit -m "feat: add GAME_BET, GAME_WIN, GAME_REFUND to chip_movements ENUM"
```

---

## Task 3: Extend ChipMovementType enum in helper

**Files:**
- Modify: `helper/src/types/enums.types.ts`

- [ ] **Step 1: Add three new enum values**

In `helper/src/types/enums.types.ts`, find the `ChipMovementType` enum and add:

```typescript
export enum ChipMovementType {
  // Sales
  SELL_TO_PLAYER = 'SELL_TO_PLAYER',
  BUY_FROM_ADMIN = 'BUY_FROM_ADMIN',

  // Game Results
  PRIZE = 'PRIZE',
  LOSS = 'LOSS',

  // Transactions
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',

  // Administrative
  RECOVERY = 'RECOVERY',
  ADJUSTMENT = 'ADJUSTMENT',

  // Panel
  PANEL_ASSIGNMENT = 'PANEL_ASSIGNMENT',
  PANEL_SALE = 'PANEL_SALE',

  // Provider game activity
  GAME_BET = 'GAME_BET',
  GAME_WIN = 'GAME_WIN',
  GAME_REFUND = 'GAME_REFUND'
}
```

- [ ] **Step 2: Rebuild helper**

```bash
cd helper && pnpm build
```

Expected: no errors.

- [ ] **Step 3: Verify no breakage in api and web**

```bash
cd api && pnpm type-check
cd ../web && pnpm type-check
```

Expected: no errors. (`ChipMovementModel.init` uses `...Object.values(ChipMovementType)` so it auto-includes the new values.)

- [ ] **Step 4: Commit**

```bash
git add helper/src/types/enums.types.ts helper/dist/
git commit -m "feat: add GAME_BET, GAME_WIN, GAME_REFUND to ChipMovementType"
```

---

## Task 4: Update chip-movements repository to support transactions

**Files:**
- Modify: `api/src/persistence/repositories/chip-movements.repository.ts`

Context: The current `create()` method has no `Transaction` parameter. We need to pass the Sequelize `Transaction` from `transactions.domain.ts` so the chip_movement is written atomically alongside the provider_transaction.

- [ ] **Step 1: Update the import and method signature**

```typescript
// api/src/persistence/repositories/chip-movements.repository.ts
import { ChipMovementModel } from '../models';
import { ChipMovement, CreateChipMovementDto, ChipMovementType } from 'helper';
import { Op, Transaction } from 'sequelize';   // add Transaction import
```

Change the `create` method signature from:
```typescript
async create(movementData: CreateChipMovementDto & {
  previousBalance: number;
  newBalance: number;
}): Promise<ChipMovement>
```

to:

```typescript
async create(
  movementData: CreateChipMovementDto & {
    previousBalance: number;
    newBalance: number;
  },
  transaction?: Transaction
): Promise<ChipMovement> {
  const movement = await ChipMovementModel.create(
    {
      userId: movementData.userId,
      relatedUserId: movementData.relatedUserId || null,
      type: movementData.type,
      amount: movementData.amount,
      description: movementData.description || null,
      previousBalance: movementData.previousBalance,
      newBalance: movementData.newBalance
    },
    { transaction }
  );

  return this.mapToMovement(movement);
}
```

- [ ] **Step 2: Type-check**

```bash
cd api && pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/persistence/repositories/chip-movements.repository.ts
git commit -m "feat: add optional Transaction param to chipMovementsRepository.create"
```

---

## Task 5: Dual-write chip_movement from transactions.domain.ts

**Files:**
- Modify: `api/src/domain/integrations/21viral/transactions.domain.ts`

Context: `executeTransaction()` runs inside a `sequelize.transaction`. After `providerTransactionRepository.create()` returns, we add a `chipMovementsRepository.create()` call within the same DB transaction `t`.

Mapping:
- `TransactionType.Debit` → `ChipMovementType.GAME_BET`
- `TransactionType.Credit` → `ChipMovementType.GAME_WIN`
- `TransactionType.Reversal` → `ChipMovementType.GAME_REFUND`

The `description` encodes the provider game round ID for traceability.

- [ ] **Step 1: Write the failing test**

Create `api/tests/domain/integrations/transactions.domain.test.ts`:

```typescript
import { transactionsDomain } from '../../../src/domain/integrations/21viral/transactions.domain';
import { viralService } from '../../../src/services/viral.service';
import { userProviderProfileRepository } from '../../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../../src/persistence/repositories/users.repository';
import { providerTransactionRepository } from '../../../src/persistence/repositories/providerTransaction.repository';
import { chipMovementsRepository } from '../../../src/persistence/repositories/chip-movements.repository';
import { sequelize } from '../../../src/config/sequelize';
import { TransactionType, UserRole, ChipMovementType } from 'helper';

jest.mock('../../../src/config', () => ({
  config: {
    viral: { username: 'testuser', secretKey: 'a'.repeat(32), integratorUrl: 'https://api.stg.games-viral.com/' }
  }
}));
jest.mock('../../../src/persistence/repositories/userProviderProfile.repository', () => ({
  userProviderProfileRepository: { findByProviderPlayerId: jest.fn() }
}));
jest.mock('../../../src/persistence/repositories/balances.repository', () => ({
  balancesRepository: { findByUserIdWithLock: jest.fn(), updateChipBalance: jest.fn() }
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
jest.mock('../../../src/persistence/repositories/chip-movements.repository', () => ({
  chipMovementsRepository: { create: jest.fn() }
}));
jest.mock('../../../src/config/sequelize', () => ({
  sequelize: { transaction: jest.fn() }
}));

const mockProfileRepo = userProviderProfileRepository as jest.Mocked<typeof userProviderProfileRepository>;
const mockBalancesRepo = balancesRepository as jest.Mocked<typeof balancesRepository>;
const mockUsersRepo = usersRepository as jest.Mocked<typeof usersRepository>;
const mockProviderTxRepo = providerTransactionRepository as jest.Mocked<typeof providerTransactionRepository>;
const mockChipRepo = chipMovementsRepository as jest.Mocked<typeof chipMovementsRepository>;
const mockSequelize = sequelize as jest.Mocked<typeof sequelize>;

describe('transactionsDomain.processTransaction', () => {
  beforeEach(() => jest.clearAllMocks());

  const baseProfile = {
    id: 'profile-1', userId: 'user-1', providerName: '21viral',
    providerPlayerId: '100001', currency: 'ARS', countryCode: 'AR',
    isActive: true, createdAt: new Date(), updatedAt: new Date()
  };
  const baseUser = {
    id: 'user-1', username: 'player1', email: null, role: UserRole.PLAYER,
    status: 'ACTIVE' as any, createdAt: new Date(), updatedAt: new Date()
  };
  const baseBalance = { id: 'bal-1', userId: 'user-1', chipBalance: '500.00', lastUpdatedAt: new Date() };
  const baseProviderTx = {
    id: 'ptx-1', providerName: '21viral', providerTransactionId: 'txn-debit-1',
    providerGameRoundId: 'round-1', providerGameId: 'vs25wolfgold',
    providerPlayerId: '100001', userId: 'user-1',
    transactionType: TransactionType.Debit, betType: null, gameRoundStatus: null,
    amount: '10.00', currency: 'ARS', balanceAfter: '490.00',
    betOutcomeEventData: null, createdAt: new Date(), updatedAt: new Date()
  };

  const debitReq = {
    playerId: '100001', providerTransactionId: 'txn-debit-1',
    transactionType: TransactionType.Debit, amount: '10.00',
    providerGameRoundId: 'round-1', providerGameId: 'vs25wolfgold'
  };

  function setupSequelizeTransaction() {
    mockSequelize.transaction.mockImplementation(async (fn: any) => fn({}));
  }

  it('creates a GAME_BET chip_movement on Debit', async () => {
    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(baseProfile);
    mockUsersRepo.findById.mockResolvedValue(baseUser as any);
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    setupSequelizeTransaction();
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue(baseBalance as any);
    mockBalancesRepo.updateChipBalance.mockResolvedValue(undefined as any);
    mockProviderTxRepo.create.mockResolvedValue(baseProviderTx as any);
    mockChipRepo.create.mockResolvedValue({} as any);

    await transactionsDomain.processTransaction(debitReq as any);

    expect(mockChipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: ChipMovementType.GAME_BET,
        amount: 10,
        previousBalance: 500,
        newBalance: 490
      }),
      expect.anything()
    );
  });

  it('creates a GAME_WIN chip_movement on Credit', async () => {
    const creditReq = { ...debitReq, transactionType: TransactionType.Credit, providerTransactionId: 'txn-credit-1' };
    const creditProviderTx = { ...baseProviderTx, transactionType: TransactionType.Credit, amount: '10.00', balanceAfter: '510.00', providerTransactionId: 'txn-credit-1' };

    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(baseProfile);
    mockUsersRepo.findById.mockResolvedValue(baseUser as any);
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    setupSequelizeTransaction();
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue(baseBalance as any);
    mockBalancesRepo.updateChipBalance.mockResolvedValue(undefined as any);
    mockProviderTxRepo.create.mockResolvedValue(creditProviderTx as any);
    mockChipRepo.create.mockResolvedValue({} as any);

    await transactionsDomain.processTransaction(creditReq as any);

    expect(mockChipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: ChipMovementType.GAME_WIN,
        amount: 10,
        previousBalance: 500,
        newBalance: 510
      }),
      expect.anything()
    );
  });

  it('creates a GAME_REFUND chip_movement on Reversal', async () => {
    const reversalReq = { ...debitReq, transactionType: TransactionType.Reversal, providerTransactionId: 'txn-refund-1' };
    const reversalProviderTx = { ...baseProviderTx, transactionType: TransactionType.Reversal, balanceAfter: '510.00', providerTransactionId: 'txn-refund-1' };
    const originalDebitTx = { ...baseProviderTx, transactionType: TransactionType.Debit };

    mockProfileRepo.findByProviderPlayerId.mockResolvedValue(baseProfile);
    mockUsersRepo.findById.mockResolvedValue(baseUser as any);
    mockProviderTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    setupSequelizeTransaction();
    mockBalancesRepo.findByUserIdWithLock.mockResolvedValue(baseBalance as any);
    mockBalancesRepo.updateChipBalance.mockResolvedValue(undefined as any);
    mockProviderTxRepo.findOriginalForReversal.mockResolvedValue(originalDebitTx as any);
    mockProviderTxRepo.create.mockResolvedValue(reversalProviderTx as any);
    mockChipRepo.create.mockResolvedValue({} as any);

    await transactionsDomain.processTransaction(reversalReq as any);

    expect(mockChipRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: ChipMovementType.GAME_REFUND,
        amount: 10,
        previousBalance: 500,
        newBalance: 510
      }),
      expect.anything()
    );
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd api && pnpm test -- --testPathPattern=transactions.domain --no-coverage
```

Expected: FAIL — `chipMovementsRepository.create` not called.

- [ ] **Step 3: Update transactions.domain.ts to dual-write**

In `api/src/domain/integrations/21viral/transactions.domain.ts`:

Add import at top:
```typescript
import { chipMovementsRepository } from '../../../persistence/repositories/chip-movements.repository';
import { ChipMovementType, TransactionType } from 'helper';
```

(Note: `TransactionType` is already imported — remove it from the existing import if needed; `ChipMovementType` is new.)

Update the existing import line that has `TransactionType`:
```typescript
import {
  ProviderTransactionRequest,
  ProviderTransactionResponse,
  ViralErrorCode,
  TransactionType,
  ChipMovementType
} from 'helper';
```

After the `providerTransactionRepository.create(...)` call inside `executeTransaction()`, add:

```typescript
const chipMovementType =
  req.transactionType === TransactionType.Debit
    ? ChipMovementType.GAME_BET
    : req.transactionType === TransactionType.Credit
      ? ChipMovementType.GAME_WIN
      : ChipMovementType.GAME_REFUND;

await chipMovementsRepository.create(
  {
    userId: profile.userId,
    type: chipMovementType,
    amount: parseFloat(req.amount),
    previousBalance: currentBalance.toNumber(),
    newBalance: parseFloat(newBalanceStr),
    description: req.providerGameRoundId
      ? `Round: ${req.providerGameRoundId}`
      : undefined
  },
  t
);
```

Full updated `executeTransaction()` return still stays as:
```typescript
return {
  balance: newBalanceStr,
  currency: profile.currency,
  operatorTransactionId: tx.id
};
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd api && pnpm test -- --testPathPattern=transactions.domain --no-coverage
```

Expected: 3 passing.

- [ ] **Step 5: Run all API tests**

```bash
cd api && pnpm test --no-coverage
```

Expected: all existing tests still pass (the new import doesn't break anything).

- [ ] **Step 6: Commit**

```bash
git add api/src/domain/integrations/21viral/transactions.domain.ts \
        api/tests/domain/integrations/transactions.domain.test.ts
git commit -m "feat: dual-write chip_movement (GAME_BET/WIN/REFUND) from provider transactions"
```

---

## Task 6: Admin games UI — provider info, thumbnail, manual sync button

**Files:**
- Modify: `web/app/admin/games/page.tsx`

Context: Games synced from 21Viral have `providerGameId`, `providerName`, `defaultLogo`, and `gameType` set. The current admin page shows none of this. We add: a thumbnail from `defaultLogo`, a provider badge when `providerName` is set, and a "Sincronizar" button that calls `POST /api/integrations/21viral/games/sync`.

The sync route already exists: `POST /api/integrations/21viral/games/sync` (from `gameLaunch.routes.ts`). The frontend just needs to call it.

- [ ] **Step 1: Add syncGames to useGames hook**

In `web/hooks/useGames.ts`, add at the end of the returned object and as a method:

```typescript
const syncGames = async () => {
  const response = await apiService.post<{ synced: number }>(
    '/integrations/21viral/games/sync'
  );
  if (response.success) {
    await loadGames();
  }
  return response;
};

// add syncGames to the return
return {
  games,
  loading,
  error,
  createGame,
  updateGame,
  toggleGameStatus,
  deleteGame,
  getGameById,
  reload: loadGames,
  syncGames,
};
```

- [ ] **Step 2: Update admin games page**

Replace the content of `web/app/admin/games/page.tsx` with the following (the imports section is identical except for adding `RefreshCw`):

```typescript
"use client"

import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, ToggleLeft, ToggleRight, Loader2, RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useGames } from "@/hooks/useGames"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CreateGameDto, UpdateGameDto, Game } from "helper"

export default function AdminGames() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { games, loading, createGame, updateGame, toggleGameStatus, syncGames, reload } = useGames(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [formData, setFormData] = useState<CreateGameDto>({
    name: "",
    description: "",
    minBet: 1,
    maxBet: 1000,
    houseEdge: 2.5,
  })
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  if (!user) return null

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await syncGames()
      if (response.success) {
        toast({
          title: "Sincronización completa",
          description: `${response.data?.synced ?? 0} juegos sincronizados`,
        })
      } else {
        toast({
          title: "Error",
          description: response.error?.message || "No se pudo sincronizar",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const response = await createGame(formData)
      if (response.success) {
        toast({ title: "Juego creado", description: `${formData.name} creado exitosamente` })
        setIsCreateDialogOpen(false)
        setFormData({ name: "", description: "", minBet: 1, maxBet: 1000, houseEdge: 2.5 })
      } else {
        toast({ title: "Error", description: response.error?.message || "No se pudo crear el juego", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedGame) return
    setSubmitting(true)
    try {
      const updateData: UpdateGameDto = {
        name: formData.name,
        description: formData.description,
        minBet: formData.minBet,
        maxBet: formData.maxBet,
        houseEdge: formData.houseEdge,
      }
      const response = await updateGame(selectedGame.id, updateData)
      if (response.success) {
        toast({ title: "Juego actualizado", description: `${formData.name} actualizado exitosamente` })
        setIsEditDialogOpen(false)
        setSelectedGame(null)
      } else {
        toast({ title: "Error", description: response.error?.message || "No se pudo actualizar", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (gameId: string) => {
    try {
      const response = await toggleGameStatus(gameId)
      if (response.success) {
        toast({ title: "Estado actualizado", description: response.data?.message || "Estado del juego actualizado" })
      } else {
        toast({ title: "Error", description: response.error?.message || "No se pudo cambiar el estado", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const openEditDialog = (game: Game) => {
    setSelectedGame(game)
    setFormData({ name: game.name, description: game.description, minBet: game.minBet, maxBet: game.maxBet, houseEdge: game.houseEdge })
    setIsEditDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Juegos</h1>
            <p className="text-muted-foreground">Administrar juegos del casino</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Juego
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Juego</DialogTitle>
                  <DialogDescription>Crea un nuevo juego para el casino</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Nombre del Juego</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ruleta, Blackjack, etc." />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción del juego..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minBet">Apuesta Mínima ($)</Label>
                      <Input id="minBet" type="number" step="0.01" min="0.01" value={formData.minBet} onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                      <Label htmlFor="maxBet">Apuesta Máxima ($)</Label>
                      <Input id="maxBet" type="number" step="0.01" min="0.01" value={formData.maxBet} onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="houseEdge">House Edge (%)</Label>
                    <Input id="houseEdge" type="number" step="0.1" min="0" max="100" value={formData.houseEdge} onChange={(e) => setFormData({ ...formData, houseEdge: parseFloat(e.target.value) })} />
                    <p className="text-xs text-muted-foreground mt-1">Porcentaje de ventaja de la casa (ej: 2.5%)</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Crear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <main className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <Card key={game.id}>
                  <CardHeader>
                    {game.defaultLogo && (
                      <img
                        src={game.defaultLogo}
                        alt={game.name}
                        className="w-full h-28 object-cover rounded-md mb-2"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{game.name}</CardTitle>
                      <div className="flex gap-1">
                        {game.providerName && (
                          <Badge variant="outline" className="text-xs">
                            {game.providerName}
                          </Badge>
                        )}
                        <Badge variant={game.isActive ? "default" : "secondary"}>
                          {game.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{game.description}</p>
                    <div className="space-y-2 mb-4">
                      {game.providerGameId && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Provider ID:</span>
                          <span className="font-mono text-xs truncate max-w-[140px]">{game.providerGameId}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Apuesta mínima:</span>
                        <span className="font-medium">${game.minBet.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Apuesta máxima:</span>
                        <span className="font-medium">${game.maxBet.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">House Edge:</span>
                        <span className="font-medium">{game.houseEdge}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => openEditDialog(game)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant={game.isActive ? "destructive" : "default"} size="sm" onClick={() => handleToggleStatus(game.id)} className="flex-1">
                        {game.isActive ? (
                          <><ToggleLeft className="h-4 w-4 mr-2" />Desactivar</>
                        ) : (
                          <><ToggleRight className="h-4 w-4 mr-2" />Activar</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && games.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 mb-4">No hay juegos creados aún</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Juego
                </Button>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Juego</DialogTitle>
              <DialogDescription>Modifica la configuración del juego</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Nombre del Juego</Label>
                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-minBet">Apuesta Mínima ($)</Label>
                  <Input id="edit-minBet" type="number" step="0.01" value={formData.minBet} onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <Label htmlFor="edit-maxBet">Apuesta Máxima ($)</Label>
                  <Input id="edit-maxBet" type="number" step="0.01" value={formData.maxBet} onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-houseEdge">House Edge (%)</Label>
                <Input id="edit-houseEdge" type="number" step="0.1" value={formData.houseEdge} onChange={(e) => setFormData({ ...formData, houseEdge: parseFloat(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
```

- [ ] **Step 3: Type-check web**

```bash
cd web && pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/games/page.tsx web/hooks/useGames.ts
git commit -m "feat: admin games — thumbnail, provider badge, manual sync button"
```

---

## Task 7: Admin provider transactions view

**Files:**
- Create: `api/src/controllers/admin/providerTransactions.controller.ts`
- Create: `api/src/routes/admin/providerTransactions.routes.ts`
- Create: `api/src/routes/admin/index.ts`
- Modify: `api/src/routes/index.ts` — mount `/admin`
- Create: `web/hooks/useProviderTransactions.ts`
- Create: `web/app/admin/provider-transactions/page.tsx`

Context: Admins need to see raw provider transactions to investigate game activity. The endpoint is read-only, paginated, and accepts optional filters.

- [ ] **Step 1: Add findAll to providerTransactionRepository**

In `api/src/persistence/repositories/providerTransaction.repository.ts`, add a `findAll` method:

```typescript
async findAll(options: {
  page: number;
  limit: number;
  userId?: string;
  providerName?: string;
}): Promise<{ rows: ProviderTransaction[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (options.userId) where.userId = options.userId;
  if (options.providerName) where.providerName = options.providerName;

  const { count, rows } = await ProviderTransactionModel.findAndCountAll({
    where,
    limit: options.limit,
    offset: (options.page - 1) * options.limit,
    order: [['createdAt', 'DESC']]
  });

  return { rows: rows.map(r => this.mapToProviderTransaction(r)), count };
}
```

- [ ] **Step 2: Create the controller**

```typescript
// api/src/controllers/admin/providerTransactions.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { providerTransactionRepository } from '../../persistence/repositories/providerTransaction.repository';

export class ProviderTransactionsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
      const userId = req.query.userId as string | undefined;
      const providerName = req.query.providerName as string | undefined;

      const { rows, count } = await providerTransactionRepository.findAll({
        page,
        limit,
        userId,
        providerName
      });

      return res.json(
        ApiResponseBuilder.paginated(rows, page, limit, count)
      );
    } catch (error) {
      return next(error);
    }
  }
}

export const providerTransactionsController = new ProviderTransactionsController();
```

- [ ] **Step 3: Create the route**

```typescript
// api/src/routes/admin/providerTransactions.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from 'helper';
import { providerTransactionsController } from '../../controllers/admin/providerTransactions.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole([UserRole.ADMIN, UserRole.OWNER]));

router.get('/', (req, res, next) => providerTransactionsController.getAll(req, res, next));

export default router;
```

- [ ] **Step 4: Create the admin index route**

```typescript
// api/src/routes/admin/index.ts
import { Router } from 'express';
import providerTransactionsRoutes from './providerTransactions.routes';

const router = Router();

router.use('/provider-transactions', providerTransactionsRoutes);

export default router;
```

- [ ] **Step 5: Mount admin routes in root index**

In `api/src/routes/index.ts`, add:

```typescript
import adminRoutes from './admin';
```

And add the router line:
```typescript
router.use('/admin', adminRoutes);
```

- [ ] **Step 6: Check requireRole middleware exists**

```bash
ls api/src/middleware/role.middleware.ts 2>/dev/null || echo "MISSING"
```

If MISSING, check what middleware handles role authorization in the existing codebase and adjust Step 3 accordingly (use the actual middleware name). If a `requireRole` middleware with that exact API exists, proceed. If the project uses a different pattern (e.g., inline role check in `authMiddleware`), adapt the route to use the existing pattern.

- [ ] **Step 7: Type-check**

```bash
cd api && pnpm type-check
```

Expected: no errors.

- [ ] **Step 8: Create the frontend hook**

```typescript
// web/hooks/useProviderTransactions.ts
'use client';

import { useState } from 'react';
import { apiService } from '@/services/api.service';

export interface ProviderTransaction {
  id: string;
  providerName: string;
  providerTransactionId: string;
  providerGameRoundId: string | null;
  providerGameId: string | null;
  userId: string;
  transactionType: string;
  amount: string;
  currency: string;
  balanceAfter: string;
  createdAt: string;
}

interface LoadOptions {
  page?: number;
  limit?: number;
  userId?: string;
  providerName?: string;
}

export function useProviderTransactions() {
  const [transactions, setTransactions] = useState<ProviderTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const load = async (opts?: LoadOptions) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (opts?.page) params.set('page', String(opts.page));
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.userId) params.set('userId', opts.userId);
    if (opts?.providerName) params.set('providerName', opts.providerName);

    const qs = params.toString();
    const response = await apiService.get<ProviderTransaction[]>(
      `/admin/provider-transactions${qs ? '?' + qs : ''}`
    );

    if (response.success && response.data) {
      setTransactions(response.data);
      if (response.meta) setMeta(response.meta);
    }
    setLoading(false);
    return response;
  };

  return { transactions, loading, meta, load };
}
```

- [ ] **Step 9: Create the admin provider transactions page**

```typescript
// web/app/admin/provider-transactions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useProviderTransactions } from '@/hooks/useProviderTransactions';

export default function AdminProviderTransactions() {
  const { user } = useAuth();
  const { transactions, loading, meta, load } = useProviderTransactions();
  const [userIdFilter, setUserIdFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user) load({ page, userId: userIdFilter || undefined });
  }, [user, page]);

  if (!user) return null;

  const handleSearch = () => {
    setPage(1);
    load({ page: 1, userId: userIdFilter || undefined });
  };

  const txTypeBadge = (type: string) => {
    if (type === 'Debit') return 'destructive';
    if (type === 'Credit') return 'default';
    return 'secondary';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Transacciones del Proveedor</h1>

        <div className="flex gap-2">
          <Input
            placeholder="Filtrar por User ID"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleSearch}>Buscar</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {meta.total} transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Proveedor</th>
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4">Monto</th>
                      <th className="pb-2 pr-4">Balance post</th>
                      <th className="pb-2 pr-4">Round ID</th>
                      <th className="pb-2 pr-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{tx.providerName}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={txTypeBadge(tx.transactionType)}>
                            {tx.transactionType}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 font-mono">{tx.currency} {tx.amount}</td>
                        <td className="py-2 pr-4 font-mono">{tx.balanceAfter}</td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground truncate max-w-[120px]">
                          {tx.providerGameRoundId ?? '—'}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Sin transacciones
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {page} de {meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 10: Type-check web**

```bash
cd web && pnpm type-check
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add \
  api/src/controllers/admin/providerTransactions.controller.ts \
  api/src/routes/admin/providerTransactions.routes.ts \
  api/src/routes/admin/index.ts \
  api/src/routes/index.ts \
  api/src/persistence/repositories/providerTransaction.repository.ts \
  web/hooks/useProviderTransactions.ts \
  web/app/admin/provider-transactions/page.tsx
git commit -m "feat: admin provider transactions view"
```

---

## Task 8: Player transaction history — show GAME_BET / GAME_WIN / GAME_REFUND

**Files:**
- Modify: `web/app/user/transactions/page.tsx`

Context: `useTransactions` already fetches from `GET /api/chips/movements/me` which returns all `chip_movements` for the current user. Now that the domain dual-writes `GAME_BET/GAME_WIN/GAME_REFUND`, these rows will appear automatically. We just need labels, icons, and to include them in the summary stats.

- [ ] **Step 1: Update getTransactionIcon**

Add cases for the three new types in `getTransactionIcon()`:

```typescript
case ChipMovementType.GAME_BET:
  return <ArrowUp className="h-4 w-4 text-red-600" />
case ChipMovementType.GAME_WIN:
  return <ArrowDown className="h-4 w-4 text-green-600" />
case ChipMovementType.GAME_REFUND:
  return <DollarSign className="h-4 w-4 text-yellow-600" />
```

- [ ] **Step 2: Update getTransactionLabel**

Add cases for the three new types in `getTransactionLabel()`:

```typescript
case ChipMovementType.GAME_BET:
  return 'Apuesta (proveedor)'
case ChipMovementType.GAME_WIN:
  return 'Premio (proveedor)'
case ChipMovementType.GAME_REFUND:
  return 'Reembolso (proveedor)'
```

- [ ] **Step 3: Include GAME_BET in losses filter and GAME_WIN in prizes filter**

Update the filter lines:

```typescript
const losses = transactions.filter(
  (tx) =>
    tx.type === ChipMovementType.LOSS ||
    tx.type === ChipMovementType.GAME_BET
)
const prizes = transactions.filter(
  (tx) =>
    tx.type === ChipMovementType.PRIZE ||
    tx.type === ChipMovementType.GAME_WIN
)
```

- [ ] **Step 4: Type-check**

```bash
cd web && pnpm type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/app/user/transactions/page.tsx
git commit -m "feat: show GAME_BET/GAME_WIN/GAME_REFUND in player transaction history"
```

---

## Self-Review

### Spec coverage
- ✅ node-cron 12h sync — Task 1
- ✅ GAME_BET/GAME_WIN/GAME_REFUND enum values — Tasks 2 & 3
- ✅ DB migration for new ENUM values — Task 2
- ✅ chip-movements.repository supports Transaction param — Task 4
- ✅ Dual-write inside executeTransaction — Task 5 (with tests)
- ✅ Admin games: thumbnail, providerName badge, sync button — Task 6
- ✅ Admin provider transactions view — Task 7
- ✅ Player transaction history updated — Task 8

### Risks
- Task 7 Step 6: `requireRole` middleware assumed to exist. If it doesn't, the implementer must adapt the route to use the existing role-check pattern.
- Task 2: `ALTER TYPE … ADD VALUE` is auto-committed in PostgreSQL (not transactional). The `IF NOT EXISTS` guard prevents errors on re-runs.
- `ChipMovementModel.init` uses `DataTypes.ENUM(...Object.values(ChipMovementType))` so it picks up new values automatically after the helper rebuild — no model change needed.
