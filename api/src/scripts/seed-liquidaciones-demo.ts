/**
 * Datos ficticios para probar la cuenta corriente y las liquidaciones.
 *
 *   cd api
 *   APP_ENV=development npx ts-node -T src/scripts/seed-liquidaciones-demo.ts           # crear
 *   APP_ENV=development npx ts-node -T src/scripts/seed-liquidaciones-demo.ts --clean   # borrar
 *
 * Crea, bajo el owner, el cajero `demo_cajero` (comisión 20 %) con 5 jugadores.
 * La semana es la de domingo a sábado que termina ayer: el domingo recibe
 * 60.000 fichas y para el sábado vendió 50.000 a sus jugadores. Queda sin
 * liquidar, para probar la pestaña "Cuenta corriente".
 *
 * Usa los mismos dominios que el backoffice (usuarios, fichas, comisión), así
 * que saldos y movimientos quedan consistentes. Después corrige las fechas
 * (created_at) para repartirlos en los días de la semana.
 *
 * Nunca corre contra producción. Todos los usuarios empiezan con `demo_`.
 */
import { QueryTypes } from 'sequelize';
import { CompensationType, UserRole } from 'helper';
import { config } from '../config';
import { sequelize } from '../config/sequelize';
import '../persistence/models';
import { usersDomain } from '../features/users/users.domain';
import { usersRepository } from '../features/users/users.repository';
import { chipsDomain } from '../features/chips/chips.domain';
import { cashierAccountsDomain } from '../features/cashier-accounts/cashier-accounts.domain';

const PREFIX = 'demo_';
const PASSWORD = 'demo12345';

type Op =
  | { day: number; hour: number; kind: 'deliver'; amount: number }
  | { day: number; hour: number; kind: 'sell'; player: number; amount: number }
  | { day: number; hour: number; kind: 'prize'; player: number; amount: number };

interface CashierPlan {
  name: string;
  percentage: number;
  players: number;
  week: Op[];
}

// day: 0 = domingo … 6 = sábado.
const PLAN: CashierPlan = {
  name: 'cajero',
  percentage: 20,
  players: 5,
  week: [
    { day: 0, hour: 10, kind: 'deliver', amount: 60000 },
    { day: 1, hour: 15, kind: 'sell', player: 1, amount: 8000 },
    { day: 2, hour: 19, kind: 'sell', player: 2, amount: 6000 },
    { day: 3, hour: 21, kind: 'sell', player: 3, amount: 9000 },
    { day: 4, hour: 18, kind: 'sell', player: 4, amount: 7000 },
    { day: 5, hour: 22, kind: 'sell', player: 5, amount: 12000 },
    { day: 6, hour: 17, kind: 'sell', player: 1, amount: 8000 }
  ]
};

/** La semana de domingo a sábado que termina ayer (los 7 días previos a hoy). */
function week(now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setMilliseconds(-1); // ayer 23:59:59.999
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

const at = (weekStart: Date, day: number, hour: number) => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + day);
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return date;
};

const fmt = (date: Date) =>
  date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

async function setCreatedAt(table: string, id: string, date: Date) {
  await sequelize.query(`UPDATE ${table} SET created_at = :date WHERE id = :id`, {
    replacements: { date, id }
  });
}

async function runOps(
  ownerId: string,
  cashierId: string,
  players: string[],
  ops: Op[],
  weekStart: Date
) {
  for (const op of ops) {
    const when = at(weekStart, op.day, op.hour);
    const movement =
      op.kind === 'deliver'
        ? await chipsDomain.sellChips(ownerId, cashierId, op.amount, 'Demo: entrega de fichas')
        : op.kind === 'sell'
          ? await chipsDomain.sellChips(cashierId, players[op.player - 1], op.amount, 'Demo: venta')
          : await chipsDomain.payPrize(cashierId, players[op.player - 1], op.amount, 'Demo: premio');
    await setCreatedAt('chip_movements', movement.id, when);
  }
}

async function findDemoUserIds(): Promise<string[]> {
  const rows = await sequelize.query<{ id: string }>(
    `SELECT id FROM users WHERE username LIKE :prefix`,
    { replacements: { prefix: `${PREFIX}%` }, type: QueryTypes.SELECT }
  );
  return rows.map(row => row.id);
}

async function clean() {
  const ids = await findDemoUserIds();
  if (ids.length === 0) {
    console.log('No hay usuarios demo_ para borrar.');
    return;
  }
  await sequelize.transaction(async transaction => {
    const opts = { replacements: { ids }, transaction };
    await sequelize.query(
      `DELETE FROM chip_movements WHERE user_id IN (:ids) OR related_user_id IN (:ids)`,
      opts
    );
    await sequelize.query(`DELETE FROM cashier_collections WHERE cashier_id IN (:ids)`, opts);
    await sequelize.query(`DELETE FROM cashier_settlements WHERE cashier_id IN (:ids)`, opts);
    await sequelize.query(`DELETE FROM cashier_compensation_modes WHERE cashier_id IN (:ids)`, opts);
    await sequelize.query(`DELETE FROM sessions WHERE user_id IN (:ids)`, opts);
    await sequelize.query(`DELETE FROM balances WHERE user_id IN (:ids)`, opts);
    // Jugadores primero: sus padres son cajeros demo.
    await sequelize.query(
      `DELETE FROM users WHERE id IN (:ids) AND role = 'PLAYER'`,
      opts
    );
    await sequelize.query(`DELETE FROM users WHERE id IN (:ids)`, opts);
  });
  console.log(`Borrados ${ids.length} usuarios demo_ con sus movimientos y liquidaciones.`);
}

async function seed() {
  const existing = await findDemoUserIds();
  if (existing.length > 0) {
    throw new Error(
      `Ya hay ${existing.length} usuarios demo_. Corré primero con --clean para empezar de cero.`
    );
  }

  const owner = await usersRepository.findOwner();
  if (!owner) throw new Error('No hay ningún usuario OWNER en esta base.');

  const { start, end } = week();

  const cashier = await usersDomain.createUser(owner.id, {
    role: UserRole.CASHIER,
    username: `${PREFIX}${PLAN.name}`,
    password: PASSWORD,
    firstName: 'Demo',
    lastName: 'Cajero'
  });

  await cashierAccountsDomain.updateCompensation(owner.id, cashier.id, {
    type: CompensationType.PERCENTAGE,
    percentage: PLAN.percentage
  });
  // La comisión tiene que estar vigente desde antes de la semana.
  const modeFrom = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  await sequelize.query(
    `UPDATE cashier_compensation_modes SET active_from = :from, created_at = :from
      WHERE cashier_id = :cashierId`,
    { replacements: { from: modeFrom, cashierId: cashier.id } }
  );

  const players: string[] = [];
  for (let i = 1; i <= PLAN.players; i += 1) {
    const player = await usersDomain.createUser(cashier.id, {
      role: UserRole.PLAYER,
      username: `${PREFIX}jugador${i}`,
      password: PASSWORD
    });
    players.push(player.id);
  }

  await runOps(owner.id, cashier.id, players, PLAN.week, start);

  console.log(`
Listo. Cajero ${PREFIX}${PLAN.name} y jugadores ${PREFIX}jugador1..${PLAN.players}
(contraseña ${PASSWORD}) bajo el owner "${owner.username}".

Semana: ${fmt(start)} al ${fmt(end)} — elegí ese rango en "Cuenta corriente".

Valores esperados:
  comisión 20 %   entregadas 60.000 · venta de fichas 50.000 · premios 0
  comisión 10.000 · subtotal 40.000 · saldo ant. 0 · total 40.000
  fichas del cajero 10.000 → no vendidas 10.000 (deje por defecto: todas)
`);
}

async function main() {
  const env = process.env.APP_ENV ?? config.server.env;
  if (env === 'production') {
    throw new Error('Este script no corre contra producción.');
  }
  if (process.argv.includes('--clean')) {
    await clean();
  } else {
    await seed();
  }
}

main()
  .catch(error => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
    // Algunos módulos dejan timers (caches): salir explícitamente.
    process.exit(process.exitCode ?? 0);
  });
