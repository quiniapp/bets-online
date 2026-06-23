# Game Launch (21Viral) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the game catalog sync and game session launch endpoints so players can browse 21Viral games and launch them from the frontend.

**Architecture:** Two new flows — (1) Admin-triggered `POST /api/integrations/21viral/games/sync` fetches the Provider game catalog and upserts it into the local `games` table; (2) Player-facing `POST /api/games/:id/launch` finds or creates the player's `UserProviderProfile`, reads their balance, calls the Provider to create a game session, and returns the `gameStartUrl` for the iframe. Follows existing pattern: routes → controller → domain → repository/service. HMAC signing utility extracted from the existing inbound middleware.

**Tech Stack:** Express.js, Sequelize 6 + PostgreSQL, Zod, `crypto` (Node built-in), native `fetch` (Node 20+), Jest + supertest. All provider-callbacks types/repos available after merging `origin/develop`.

**Spec:** `docs/superpowers/specs/2026-03-18-provider-callbacks-design.md` §14

**Branch:** `integration-games` (already checked out)

---

## Pre-requisite: Sync with remote develop

> The `feature/provider-callbacks` PR was merged to `origin/develop` on 2026-03-26. The local `integration-games` branch does not yet have that code (UserProviderProfile model/repo, HMAC middleware, viral config, etc.). This must be done before any task below.

- [ ] **Step 1: Merge origin/develop into integration-games**

```bash
cd C:\Programacion\Casino\bets-online
git merge origin/develop --no-edit
```

Expected: no conflicts (integration-games only has 1 commit ahead of old develop). After merge, verify:

```bash
ls api/src/persistence/repositories/userProviderProfile.repository.ts
ls api/src/middleware/hmac.middleware.ts
```

Both files should exist.

- [ ] **Step 2: Verify envs have VIRAL config**

Open `api/src/config/envs.ts` and confirm the schema includes:
```typescript
VIRAL_USERNAME: z.string().min(1, 'VIRAL_USERNAME is required'),
VIRAL_SECRET_KEY: z.string().min(32, 'VIRAL_SECRET_KEY must be at least 32 characters'),
INTEGRATOR_URL: z.string().url().optional()
```
And `envs` object has:
```typescript
viral: {
  username: envVars.VIRAL_USERNAME,
  secretKey: envVars.VIRAL_SECRET_KEY,
  integratorUrl: envVars.INTEGRATOR_URL
}
```

If missing, add them manually.

- [ ] **Step 3: Verify .env.local has the viral vars**

Open `.env.local` and confirm these keys exist (values should already be there from provider-callbacks work):
```
VIRAL_USERNAME=arenabet
VIRAL_SECRET_KEY=<your-dev-secret-key>
INTEGRATOR_URL=https://api.stg.games-viral.com/
```

---

## Chunk 1: HMAC signing utility + viral.service.ts

### Files
- Create: `api/src/utils/hmac.utils.ts`
- Create: `api/src/services/viral.service.ts`

---

### Task 1: Extract HMAC sign utility

The existing `api/src/middleware/hmac.middleware.ts` already has `canonicalize` and `generateHmac` as private functions. We need them for outbound signing. Extract to a shared util instead of duplicating.

- [ ] **Step 1: Write the failing test**

Create `api/tests/utils/hmac.utils.test.ts`:

```typescript
import { buildHmacAuthHeader, canonicalize } from '../../src/utils/hmac.utils';

describe('hmac.utils', () => {
  describe('canonicalize', () => {
    it('sorts object keys alphabetically', () => {
      const input = { z: 1, a: 2, m: 3 };
      expect(canonicalize(input)).toBe('{"a":2,"m":3,"z":1}');
    });

    it('handles nested objects recursively', () => {
      const input = { b: { y: 1, x: 2 }, a: 'hello' };
      expect(canonicalize(input)).toBe('{"a":"hello","b":{"x":2,"y":1}}');
    });

    it('matches the example from 21Viral spec', () => {
      const body = {
        playerId: '1',
        currency: 'EUR',
        providerName: 'pragmatic',
        providerGameId: 'vs20olympgate',
        gameMode: 'Real',
        timestamp: 1734904927,
        language: 'en',
        playerDeviceType: 'Desktop',
        balance: '504.44',
        playerUserName: 'player1'
      };
      const expected =
        '{"balance":"504.44","currency":"EUR","gameMode":"Real","language":"en",' +
        '"playerDeviceType":"Desktop","playerId":"1","playerUserName":"player1",' +
        '"providerGameId":"vs20olympgate","providerName":"pragmatic","timestamp":1734904927}';
      expect(canonicalize(body)).toBe(expected);
    });
  });

  describe('buildHmacAuthHeader', () => {
    it('produces the Authorization header from the 21Viral spec example', () => {
      const body = {
        playerId: '1',
        currency: 'EUR',
        providerName: 'pragmatic',
        providerGameId: 'vs20olympgate',
        gameMode: 'Real',
        timestamp: 1734904927,
        language: 'en',
        playerDeviceType: 'Desktop',
        balance: '504.44',
        playerUserName: 'player1'
      };
      const header = buildHmacAuthHeader('app-id-1', 'app secret', body);
      expect(header).toBe(
        'HMAC-SHA256 app-id-1:1e06d2f27b2deee94aae1b09230a1027afc58da7aeae9311bc8ceb2d8e21bf5b'
      );
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd C:\Programacion\Casino\bets-online
pnpm --filter api test -- --testPathPattern="hmac.utils" --passWithNoTests
```

Expected: `FAIL` — cannot find module `../../src/utils/hmac.utils`.

- [ ] **Step 3: Create `api/src/utils/hmac.utils.ts`**

```typescript
import crypto from 'crypto';

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  return `{${sorted.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

export function buildHmacAuthHeader(
  username: string,
  secretKey: string,
  body: Record<string, unknown>
): string {
  const canonical = canonicalize(body);
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(canonical, 'utf8')
    .digest('hex');
  return `HMAC-SHA256 ${username}:${signature}`;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter api test -- --testPathPattern="hmac.utils"
```

Expected: `PASS` — 4 tests pass.

- [ ] **Step 5: Update hmac.middleware.ts to use the shared util**

Open `api/src/middleware/hmac.middleware.ts`. Replace the local `canonicalize` and `generateHmac` functions with imports:

```typescript
// Remove the local functions and add at top:
import { canonicalize, buildHmacAuthHeader } from '../utils/hmac.utils';
```

Then replace the internal call `generateHmac(config.secretKey, canonicalBody)` with `buildHmacAuthHeader(...)` — actually just use `canonicalize` for the body and call `crypto.createHmac` directly using the already-imported function, or extract the signature building:

Replace:
```typescript
function canonicalize(value: unknown): string { ... }
function generateHmac(secretKey: string, canonicalBody: string): string { ... }
```

with at the top of the file:
```typescript
import { canonicalize, buildHmacAuthHeader as _buildHmacAuthHeader } from '../utils/hmac.utils';
```

And replace the signature comparison block that does:
```typescript
const canonical = canonicalize(req.body);
const expected = generateHmac(config.secretKey, canonical);
```
with:
```typescript
const canonical = canonicalize(req.body);
const expected = crypto.createHmac('sha256', config.secretKey).update(canonical, 'utf8').digest('hex');
```

(Keep `crypto` import as-is — we still need it for `timingSafeEqual`.)

- [ ] **Step 6: Run full API tests to confirm no regressions**

```bash
pnpm --filter api test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add api/src/utils/hmac.utils.ts api/tests/utils/hmac.utils.test.ts api/src/middleware/hmac.middleware.ts
git commit -m "feat: extract HMAC canonicalize and sign into shared hmac.utils"
```

---

### Task 2: Create viral.service.ts

Handles all outbound HTTP calls to the 21Viral Provider API.

- [ ] **Step 1: Write the failing test**

Create `api/tests/services/viral.service.test.ts`:

```typescript
import { viralService } from '../../src/services/viral.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('viralService', () => {
  const FAKE_USERNAME = 'testuser';
  const FAKE_SECRET = 'a'.repeat(32);
  const FAKE_URL = 'https://api.stg.games-viral.com/';

  beforeEach(() => {
    jest.clearAllMocks();
    // Override config for tests
    (viralService as any).username = FAKE_USERNAME;
    (viralService as any).secretKey = FAKE_SECRET;
    (viralService as any).baseUrl = FAKE_URL;
  });

  describe('getGames', () => {
    it('sends POST to /v1/games with HMAC Authorization header', async () => {
      const fakeGames = [
        { id: 1, name: 'Wolf Gold', type: 'slot', defaultLogo: 'https://img/wolf.png', providerName: 'pragmatic', providerGameId: 'vs25wolfgold' }
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => fakeGames
      });

      const result = await viralService.getGames();

      expect(mockFetch).toHaveBeenCalledWith(
        `${FAKE_URL}v1/games`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: expect.stringMatching(/^HMAC-SHA256 testuser:/)
          })
        })
      );
      expect(result).toEqual(fakeGames);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(viralService.getGames()).rejects.toThrow('21Viral getGames failed: 500');
    });
  });

  describe('createGameSession', () => {
    it('sends POST to /v1/games/sessions and returns gameStartUrl', async () => {
      const fakeUrl = 'https://games.provider.com/session/abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ gameStartUrl: fakeUrl })
      });

      const result = await viralService.createGameSession({
        playerId: '100001',
        playerUserName: 'testplayer',
        playerDeviceType: 'Desktop',
        providerName: 'pragmatic',
        providerGameId: 'vs25wolfgold',
        gameMode: 'Real',
        localeCode: 'es-AR',
        countryCode: 'AR',
        currency: 'ARS',
        balance: '500.00',
        lobbyUrl: 'https://operator.com/lobby',
        depositUrl: 'https://operator.com/deposit'
      });

      expect(result).toBe(fakeUrl);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable'
      });

      await expect(
        viralService.createGameSession({
          playerId: '100001',
          playerUserName: 'test',
          playerDeviceType: 'Desktop',
          providerName: 'pragmatic',
          providerGameId: 'vs25wolfgold',
          gameMode: 'Real',
          localeCode: 'es-AR',
          countryCode: 'AR',
          currency: 'ARS',
          balance: '0.00',
          lobbyUrl: 'https://op.com/lobby',
          depositUrl: 'https://op.com/deposit'
        })
      ).rejects.toThrow('21Viral createGameSession failed: 422');
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter api test -- --testPathPattern="viral.service"
```

Expected: `FAIL` — cannot find module.

- [ ] **Step 3: Create `api/src/services/viral.service.ts`**

```typescript
import { config } from '../config';
import { buildHmacAuthHeader } from '../utils/hmac.utils';

export interface ViralGame {
  id: number;
  name: string;
  type: string;
  defaultLogo: string;
  providerName: string;
  providerGameId: string;
}

export interface CreateGameSessionParams {
  playerId: string;
  playerUserName: string;
  playerDeviceType: 'Desktop' | 'Mobile';
  providerName: string;
  providerGameId: string;
  gameMode: 'Real' | 'Demo';
  localeCode: string;
  countryCode: string;
  currency: string;
  balance: string;
  lobbyUrl: string;
  depositUrl: string;
  promoBalance?: string;
  exitUrl?: string;
}

class ViralService {
  private username: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.username = config.viral.username;
    this.secretKey = config.viral.secretKey;
    this.baseUrl = config.viral.integratorUrl ?? 'https://api.stg.games-viral.com/';
  }

  private buildHeaders(body: Record<string, unknown>): Record<string, string> {
    return {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: buildHmacAuthHeader(this.username, this.secretKey, body)
    };
  }

  async getGames(): Promise<ViralGame[]> {
    const body = { timestamp: Math.floor(Date.now() / 1000) };
    const res = await fetch(`${this.baseUrl}v1/games`, {
      method: 'POST',
      headers: this.buildHeaders(body),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`21Viral getGames failed: ${res.status} — ${text}`);
    }

    return res.json() as Promise<ViralGame[]>;
  }

  async createGameSession(params: CreateGameSessionParams): Promise<string> {
    const body: Record<string, unknown> = {
      timestamp: Math.floor(Date.now() / 1000),
      playerId: params.playerId,
      playerUserName: params.playerUserName,
      playerDeviceType: params.playerDeviceType,
      providerName: params.providerName,
      providerGameId: params.providerGameId,
      gameMode: params.gameMode,
      localeCode: params.localeCode,
      countryCode: params.countryCode,
      currency: params.currency,
      balance: params.balance,
      lobbyUrl: params.lobbyUrl,
      depositUrl: params.depositUrl
    };

    if (params.promoBalance !== undefined) body.promoBalance = params.promoBalance;
    if (params.exitUrl !== undefined) body.exitUrl = params.exitUrl;

    const res = await fetch(`${this.baseUrl}v1/games/sessions`, {
      method: 'POST',
      headers: this.buildHeaders(body),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`21Viral createGameSession failed: ${res.status} — ${text}`);
    }

    const data = (await res.json()) as { gameStartUrl: string };
    return data.gameStartUrl;
  }
}

export const viralService = new ViralService();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter api test -- --testPathPattern="viral.service"
```

Expected: `PASS` — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/src/services/viral.service.ts api/tests/services/viral.service.test.ts
git commit -m "feat: add ViralService for outbound 21Viral API calls"
```

---

## Chunk 2: DB migration — extend games table

### Files
- Create: `api/src/persistence/migrations/20260408000001-alter-games-add-provider-fields.js`
- Create: `api/src/persistence/migrations/20260408000002-create-viral-player-id-seq.js`
- Modify: `api/src/persistence/models/game.model.ts`
- Modify: `helper/src/types/models.types.ts`

---

### Task 3: Migrate games table and add player ID sequence

- [ ] **Step 1: Create migration for games table**

Create `api/src/persistence/migrations/20260408000001-alter-games-add-provider-fields.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('games', 'provider_game_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('games', 'provider_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    await queryInterface.addColumn('games', 'default_logo', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('games', 'game_type', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    await queryInterface.addIndex('games', ['provider_name', 'provider_game_id'], {
      unique: true,
      name: 'uq_games_provider',
      where: { provider_game_id: { [Sequelize.Op.ne]: null } }
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('games', 'uq_games_provider');
    await queryInterface.removeColumn('games', 'game_type');
    await queryInterface.removeColumn('games', 'default_logo');
    await queryInterface.removeColumn('games', 'provider_name');
    await queryInterface.removeColumn('games', 'provider_game_id');
  }
};
```

- [ ] **Step 2: Create migration for viral player ID sequence**

Create `api/src/persistence/migrations/20260408000002-create-viral-player-id-seq.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE SEQUENCE IF NOT EXISTS viral_player_id_seq START WITH 100001 INCREMENT BY 1 NO CYCLE'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS viral_player_id_seq');
  }
};
```

- [ ] **Step 3: Run migrations**

```bash
cd C:\Programacion\Casino\bets-online
NODE_ENV=local APP_ENV=local pnpm --filter api db:migrate
```

Expected: both migrations run successfully.

- [ ] **Step 4: Update `helper/src/types/models.types.ts`**

Find the `Game` interface and add the new optional fields:

```typescript
export interface Game {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  minBet: number;
  maxBet: number;
  houseEdge: number;
  providerId?: string | null;
  providerGameId?: string | null;   // e.g. "vs25wolfgold"
  providerName?: string | null;     // e.g. "pragmatic"
  defaultLogo?: string | null;      // thumbnail URL from Provider
  gameType?: string | null;         // e.g. "slot"
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 5: Update `api/src/persistence/models/game.model.ts`**

Add the new declarations and field definitions inside `GameModel`:

```typescript
// After existing declare fields, add:
declare providerGameId: string | null;
declare providerName: string | null;
declare defaultLogo: string | null;
declare gameType: string | null;
```

And inside `GameModel.init(...)` fields object, add:

```typescript
providerGameId: {
  type: DataTypes.STRING(255),
  allowNull: true,
  field: 'provider_game_id'
},
providerName: {
  type: DataTypes.STRING(100),
  allowNull: true,
  field: 'provider_name'
},
defaultLogo: {
  type: DataTypes.TEXT,
  allowNull: true,
  field: 'default_logo'
},
gameType: {
  type: DataTypes.STRING(50),
  allowNull: true,
  field: 'game_type'
},
```

- [ ] **Step 6: Update `api/src/persistence/repositories/games.repository.ts`**

Add `findByProviderGame` and `upsertFromProvider` methods at the end of the `GamesRepository` class (before the private `mapToGame` method):

```typescript
async findByProviderGame(
  providerName: string,
  providerGameId: string
): Promise<Game | null> {
  const game = await GameModel.findOne({
    where: { providerName, providerGameId }
  });
  if (!game) return null;
  return this.mapToGame(game);
}

async upsertFromProvider(data: {
  providerName: string;
  providerGameId: string;
  name: string;
  gameType: string;
  defaultLogo: string;
}): Promise<Game> {
  const existing = await GameModel.findOne({
    where: { providerName: data.providerName, providerGameId: data.providerGameId }
  });

  if (existing) {
    await existing.update({
      name: data.name,
      gameType: data.gameType,
      defaultLogo: data.defaultLogo
    });
    return this.mapToGame(existing);
  }

  const created = await GameModel.create({
    name: data.name,
    description: `${data.name} — synced from ${data.providerName}`,
    isActive: true,
    minBet: 1,
    maxBet: 10000,
    houseEdge: 0,
    providerName: data.providerName,
    providerGameId: data.providerGameId,
    defaultLogo: data.defaultLogo,
    gameType: data.gameType
  });
  return this.mapToGame(created);
}
```

Also update the `mapToGame` private method to include the new fields:

```typescript
private mapToGame(model: GameModel): Game {
  const plain = model.get({ plain: true });
  return {
    id: plain.id,
    name: plain.name,
    description: plain.description,
    isActive: plain.isActive,
    minBet: Number(plain.minBet),
    maxBet: Number(plain.maxBet),
    houseEdge: Number(plain.houseEdge),
    providerId: plain.providerId ?? null,
    providerGameId: plain.providerGameId ?? null,
    providerName: plain.providerName ?? null,
    defaultLogo: plain.defaultLogo ?? null,
    gameType: plain.gameType ?? null,
    createdAt: new Date(plain.createdAt),
    updatedAt: new Date(plain.updatedAt)
  };
}
```

> ⚠️ If `mapToGame` already exists in the file, replace it entirely with the above.

- [ ] **Step 7: Build helper to verify types**

```bash
pnpm --filter helper build
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add \
  api/src/persistence/migrations/20260408000001-alter-games-add-provider-fields.js \
  api/src/persistence/migrations/20260408000002-create-viral-player-id-seq.js \
  api/src/persistence/models/game.model.ts \
  api/src/persistence/repositories/games.repository.ts \
  helper/src/types/models.types.ts
git commit -m "feat(db): add provider fields to games table and viral player ID sequence"
```

---

## Chunk 3: Game launch domain + controller + routes

### Files
- Create: `api/src/domain/integrations/21viral/gameLaunch.domain.ts`
- Create: `api/src/controllers/integrations/21viral/gameLaunch.controller.ts`
- Create: `api/src/routes/integrations/21viral/gameLaunch.routes.ts`
- Modify: `api/src/routes/integrations/21viral/index.ts`
- Modify: `api/src/routes/games/index.ts`

---

### Task 4: gameLaunch.domain.ts

Contains all business logic for (a) syncing Provider catalog and (b) creating a game session.

- [ ] **Step 1: Write failing tests**

Create `api/tests/domain/integrations/gameLaunch.domain.test.ts`:

```typescript
import { gameLaunchDomain } from '../../../src/domain/integrations/21viral/gameLaunch.domain';
import { viralService } from '../../../src/services/viral.service';
import { gamesRepository } from '../../../src/persistence/repositories/games.repository';
import { userProviderProfileRepository } from '../../../src/persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../src/persistence/repositories/balances.repository';
import { usersRepository } from '../../../src/persistence/repositories/users.repository';
import { sequelize } from '../../../src/config/sequelize';
import { UserRole } from 'helper';

jest.mock('../../../src/services/viral.service');
jest.mock('../../../src/persistence/repositories/games.repository');
jest.mock('../../../src/persistence/repositories/userProviderProfile.repository');
jest.mock('../../../src/persistence/repositories/balances.repository');
jest.mock('../../../src/persistence/repositories/users.repository');
jest.mock('../../../src/config/sequelize', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([[{ next_id: '100001' }]])
  }
}));

const mockViralService = viralService as jest.Mocked<typeof viralService>;
const mockGamesRepo = gamesRepository as jest.Mocked<typeof gamesRepository>;
const mockProfileRepo = userProviderProfileRepository as jest.Mocked<typeof userProviderProfileRepository>;
const mockBalancesRepo = balancesRepository as jest.Mocked<typeof balancesRepository>;
const mockUsersRepo = usersRepository as jest.Mocked<typeof usersRepository>;

describe('gameLaunchDomain', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('syncGames', () => {
    it('fetches games from viral and upserts each one', async () => {
      mockViralService.getGames.mockResolvedValue([
        { id: 1, name: 'Wolf Gold', type: 'slot', defaultLogo: 'https://img/wolf.png', providerName: 'pragmatic', providerGameId: 'vs25wolfgold' }
      ]);
      mockGamesRepo.upsertFromProvider.mockResolvedValue({} as any);

      const result = await gameLaunchDomain.syncGames();

      expect(mockViralService.getGames).toHaveBeenCalledTimes(1);
      expect(mockGamesRepo.upsertFromProvider).toHaveBeenCalledWith({
        providerName: 'pragmatic',
        providerGameId: 'vs25wolfgold',
        name: 'Wolf Gold',
        gameType: 'slot',
        defaultLogo: 'https://img/wolf.png'
      });
      expect(result.synced).toBe(1);
    });
  });

  describe('launchGame', () => {
    const userId = 'user-uuid-123';
    const gameId = 'game-uuid-456';
    const mockGame = {
      id: gameId,
      name: 'Wolf Gold',
      description: 'test',
      isActive: true,
      minBet: 1,
      maxBet: 10000,
      houseEdge: 0,
      providerGameId: 'vs25wolfgold',
      providerName: 'pragmatic',
      defaultLogo: null,
      gameType: 'slot',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const mockUser = {
      id: userId,
      username: 'testplayer',
      email: 'test@test.com',
      role: UserRole.USER,
      status: 'ACTIVE' as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const mockProfile = {
      id: 'profile-uuid',
      userId,
      providerName: '21viral',
      providerPlayerId: '100001',
      currency: 'ARS',
      countryCode: 'AR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const mockBalance = {
      id: 'balance-uuid',
      userId,
      chipBalance: 500.00,
      lastUpdatedAt: new Date()
    };

    it('returns gameStartUrl for existing user with profile', async () => {
      mockGamesRepo.findById.mockResolvedValue(mockGame);
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.findByUserId.mockResolvedValue(mockProfile);
      mockBalancesRepo.findByUserId.mockResolvedValue(mockBalance as any);
      mockViralService.createGameSession.mockResolvedValue('https://provider.com/session/abc');

      const result = await gameLaunchDomain.launchGame({
        userId,
        gameId,
        playerDeviceType: 'Desktop',
        gameMode: 'Real',
        lobbyUrl: 'https://op.com/lobby',
        depositUrl: 'https://op.com/deposit'
      });

      expect(result).toBe('https://provider.com/session/abc');
      expect(mockViralService.createGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: '100001',
          playerUserName: 'testplayer',
          providerName: 'pragmatic',
          providerGameId: 'vs25wolfgold',
          balance: '500.00',
          currency: 'ARS'
        })
      );
    });

    it('auto-creates UserProviderProfile when none exists', async () => {
      mockGamesRepo.findById.mockResolvedValue(mockGame);
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.findByUserId.mockResolvedValue(null);
      mockProfileRepo.create.mockResolvedValue(mockProfile);
      mockBalancesRepo.findByUserId.mockResolvedValue(mockBalance as any);
      mockViralService.createGameSession.mockResolvedValue('https://provider.com/session/new');

      const result = await gameLaunchDomain.launchGame({
        userId,
        gameId,
        playerDeviceType: 'Desktop',
        gameMode: 'Real',
        lobbyUrl: 'https://op.com/lobby',
        depositUrl: 'https://op.com/deposit'
      });

      expect(mockProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          providerName: '21viral',
          providerPlayerId: '100001'
        })
      );
      expect(result).toBe('https://provider.com/session/new');
    });

    it('throws 404 when game not found', async () => {
      mockGamesRepo.findById.mockResolvedValue(null);
      await expect(
        gameLaunchDomain.launchGame({ userId, gameId, playerDeviceType: 'Desktop', gameMode: 'Real', lobbyUrl: '', depositUrl: '' })
      ).rejects.toThrow('Game not found');
    });

    it('throws 422 when game has no providerGameId', async () => {
      mockGamesRepo.findById.mockResolvedValue({ ...mockGame, providerGameId: null, providerName: null });
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      await expect(
        gameLaunchDomain.launchGame({ userId, gameId, playerDeviceType: 'Desktop', gameMode: 'Real', lobbyUrl: '', depositUrl: '' })
      ).rejects.toThrow('Game is not linked to a provider');
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter api test -- --testPathPattern="gameLaunch.domain"
```

Expected: `FAIL` — cannot find module.

- [ ] **Step 3: Create `api/src/domain/integrations/21viral/gameLaunch.domain.ts`**

```typescript
import Decimal from 'decimal.js';
import { viralService } from '../../../services/viral.service';
import { gamesRepository } from '../../../persistence/repositories/games.repository';
import { userProviderProfileRepository } from '../../../persistence/repositories/userProviderProfile.repository';
import { balancesRepository } from '../../../persistence/repositories/balances.repository';
import { usersRepository } from '../../../persistence/repositories/users.repository';
import { sequelize } from '../../../config/sequelize';
import { AppError } from '../../../middleware/error.middleware';
import { ErrorCode } from 'helper';

export interface LaunchGameParams {
  userId: string;
  gameId: string;
  playerDeviceType: 'Desktop' | 'Mobile';
  gameMode: 'Real' | 'Demo';
  lobbyUrl: string;
  depositUrl: string;
  exitUrl?: string;
}

class GameLaunchDomain {
  async syncGames(): Promise<{ synced: number }> {
    const games = await viralService.getGames();
    for (const g of games) {
      await gamesRepository.upsertFromProvider({
        providerName: g.providerName,
        providerGameId: g.providerGameId,
        name: g.name,
        gameType: g.type,
        defaultLogo: g.defaultLogo
      });
    }
    return { synced: games.length };
  }

  async launchGame(params: LaunchGameParams): Promise<string> {
    const game = await gamesRepository.findById(params.gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    if (!game.providerGameId || !game.providerName) {
      throw new AppError(422, ErrorCode.VALIDATION_ERROR, 'Game is not linked to a provider');
    }

    const user = await usersRepository.findById(params.userId);
    if (!user) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    let profile = await userProviderProfileRepository.findByUserId(params.userId, '21viral');
    if (!profile) {
      const [[{ next_id }]] = await sequelize.query<{ next_id: string }>(
        'SELECT NEXTVAL(\'viral_player_id_seq\') AS next_id'
      );
      profile = await userProviderProfileRepository.create({
        userId: params.userId,
        providerName: '21viral',
        providerPlayerId: String(next_id),
        currency: 'ARS',
        countryCode: 'AR'
      });
    }

    const balance = await balancesRepository.findByUserId(params.userId);
    const formattedBalance = new Decimal(balance?.chipBalance ?? 0).toFixed(2);

    return viralService.createGameSession({
      playerId: profile.providerPlayerId,
      playerUserName: user.username,
      playerDeviceType: params.playerDeviceType,
      providerName: game.providerName,
      providerGameId: game.providerGameId,
      gameMode: params.gameMode,
      localeCode: 'es-AR',
      countryCode: profile.countryCode,
      currency: profile.currency,
      balance: formattedBalance,
      lobbyUrl: params.lobbyUrl,
      depositUrl: params.depositUrl,
      exitUrl: params.exitUrl
    });
  }
}

export const gameLaunchDomain = new GameLaunchDomain();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter api test -- --testPathPattern="gameLaunch.domain"
```

Expected: `PASS` — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/src/domain/integrations/21viral/gameLaunch.domain.ts api/tests/domain/integrations/gameLaunch.domain.test.ts
git commit -m "feat: add GameLaunchDomain for sync and session creation"
```

---

### Task 5: Controller + routes

- [ ] **Step 1: Create `api/src/controllers/integrations/21viral/gameLaunch.controller.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder } from 'helper';
import { gameLaunchDomain } from '../../../domain/integrations/21viral/gameLaunch.domain';

export class GameLaunchController {
  /**
   * @swagger
   * /api/integrations/21viral/games/sync:
   *   post:
   *     summary: Sync 21Viral game catalog (OWNER/ADMIN only)
   *     tags: [21Viral Integration]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sync completed
   */
  async syncGames(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await gameLaunchDomain.syncGames();
      return res.json(ApiResponseBuilder.success(result));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/games/{id}/launch:
   *   post:
   *     summary: Launch a game session for the authenticated player
   *     tags: [Games]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - playerDeviceType
   *               - lobbyUrl
   *               - depositUrl
   *             properties:
   *               playerDeviceType:
   *                 type: string
   *                 enum: [Desktop, Mobile]
   *               gameMode:
   *                 type: string
   *                 enum: [Real, Demo]
   *               lobbyUrl:
   *                 type: string
   *               depositUrl:
   *                 type: string
   *               exitUrl:
   *                 type: string
   *     responses:
   *       200:
   *         description: Game session URL returned
   */
  async launchGame(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required')
        );
      }

      const { id: gameId } = req.params;
      const { playerDeviceType, gameMode, lobbyUrl, depositUrl, exitUrl } = req.body;

      const gameStartUrl = await gameLaunchDomain.launchGame({
        userId: req.user.userId,
        gameId,
        playerDeviceType: playerDeviceType ?? 'Desktop',
        gameMode: gameMode ?? 'Real',
        lobbyUrl,
        depositUrl,
        exitUrl
      });

      return res.json(ApiResponseBuilder.success({ gameStartUrl }));
    } catch (error) {
      return next(error);
    }
  }
}

export const gameLaunchController = new GameLaunchController();
```

- [ ] **Step 2: Create `api/src/routes/integrations/21viral/gameLaunch.routes.ts`**

```typescript
import { Router } from 'express';
import { gameLaunchController } from '../../../controllers/integrations/21viral/gameLaunch.controller';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { requireRole } from '../../../middleware/auth.middleware';
import { UserRole } from 'helper';

const router = Router();

router.post(
  '/games/sync',
  authMiddleware,
  requireRole([UserRole.OWNER, UserRole.ADMIN]),
  gameLaunchController.syncGames.bind(gameLaunchController)
);

export default router;
```

> **Note:** Check if `requireRole` exists in `api/src/middleware/auth.middleware.ts`. If it doesn't, add it:
>
> ```typescript
> import { UserRole } from 'helper';
> export const requireRole = (roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
>   if (!req.user || !roles.includes(req.user.role as UserRole)) {
>     return res.status(403).json(ApiResponseBuilder.error('FORBIDDEN', 'Insufficient permissions'));
>   }
>   return next();
> };
> ```

- [ ] **Step 3: Check if `requireRole` exists in auth.middleware.ts**

```bash
grep -n "requireRole" api/src/middleware/auth.middleware.ts
```

If no output: add the `requireRole` export to `api/src/middleware/auth.middleware.ts` as shown in the note above.

- [ ] **Step 4: Mount in `api/src/routes/integrations/21viral/index.ts`**

Open `api/src/routes/integrations/21viral/index.ts` and add:

```typescript
import gameLaunchRoutes from './gameLaunch.routes';
// ... existing imports ...

// Add inside the router:
router.use('/', gameLaunchRoutes);
```

- [ ] **Step 5: Add launch route to `api/src/routes/games/index.ts`**

Open `api/src/routes/games/index.ts` and add after the existing imports:

```typescript
import { gameLaunchController } from '../../controllers/integrations/21viral/gameLaunch.controller';
import { validate, validateParams } from '../../middleware/validation.middleware';
import { z } from 'zod';
```

Add the launch schema and route (after the existing routes, before `export default router`):

```typescript
const launchGameSchema = z.object({
  playerDeviceType: z.enum(['Desktop', 'Mobile']).default('Desktop'),
  gameMode: z.enum(['Real', 'Demo']).default('Real'),
  lobbyUrl: z.string().url(),
  depositUrl: z.string().url(),
  exitUrl: z.string().url().optional()
});

router.post(
  '/:id/launch',
  authMiddleware,
  validateParams(idParamSchema),
  validate(launchGameSchema),
  gameLaunchController.launchGame.bind(gameLaunchController)
);
```

- [ ] **Step 6: Run type-check**

```bash
pnpm --filter api type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add \
  api/src/controllers/integrations/21viral/gameLaunch.controller.ts \
  api/src/routes/integrations/21viral/gameLaunch.routes.ts \
  api/src/routes/integrations/21viral/index.ts \
  api/src/routes/games/index.ts \
  api/src/middleware/auth.middleware.ts
git commit -m "feat: add game sync and launch endpoints for 21Viral integration"
```

---

## Chunk 4: Full test suite and CI

### Task 6: Verify all tests pass and push

- [ ] **Step 1: Run full test suite**

```bash
pnpm --filter api test
```

Expected: all pass (`--passWithNoTests` already set so empty suites are OK).

- [ ] **Step 2: Run type-check and lint**

```bash
pnpm --filter api type-check
pnpm --filter api lint
pnpm --filter helper type-check
```

Expected: no errors.

- [ ] **Step 3: Push branch**

```bash
git push -u origin integration-games
```

- [ ] **Step 4: Open PR**

Open PR from `integration-games` → `develop` with title:
`feat: game launch — sync 21Viral catalog and create player sessions`

---

## Summary

| Chunk | Tasks | Files | Estado |
|-------|-------|-------|--------|
| Pre-req | — | merge origin/develop | ⬜ Pendiente |
| 1 — HMAC util + service | 1-2 | `hmac.utils.ts`, `viral.service.ts` | ⬜ Pendiente |
| 2 — DB migration | 3 | games migration, viral_player_id_seq, model, repo, helper types | ⬜ Pendiente |
| 3 — Domain + controller + routes | 4-5 | `gameLaunch.domain.ts`, controller, routes | ⬜ Pendiente |
| 4 — CI | 6 | — | ⬜ Pendiente |

**Total: 6 tasks, ~8 commits**
