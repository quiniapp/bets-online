/**
 * Datos ficticios para probar la cuenta corriente y las liquidaciones.
 *
 *   cd api
 *   APP_ENV=development npx ts-node -T src/scripts/seed-liquidaciones-demo.ts           # crear
 *   APP_ENV=development npx ts-node -T src/scripts/seed-liquidaciones-demo.ts --clean   # borrar
 *
 * Crea, bajo el owner, varios cajeros demo con sus jugadores. En los 7 días
 * que terminan ayer, el owner les carga fichas, ellos las venden a sus
 * jugadores y a algunos jugadores les retiran fichas de premios. Queda sin
 * liquidar, para probar la pestaña "Liquidar".
 *
 * Es aditivo: los cajeros demo que ya existen se saltean (no se tocan sus
 * movimientos ni sus liquidaciones), así que se puede volver a correr para
 * sumar los cajeros nuevos del plan.
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
  /** Prefijo de los jugadores: `demo_<playerPrefix><n>` */
  playerPrefix: string;
  percentage: number;
  players: number;
  week: Op[];
}

// day: 0 = primer día de la ventana (hace 7 días) … 6 = ayer.
// Un premio nunca supera las fichas que el jugador tiene en ese momento.
const PLANS: CashierPlan[] = [
  {
    name: 'cajero',
    playerPrefix: 'jugador',
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
  },
  {
    // Vende casi todo y paga dos premios.
    name: 'cajero_norte',
    playerPrefix: 'norte_j',
    percentage: 20,
    players: 4,
    week: [
      { day: 0, hour: 9, kind: 'deliver', amount: 40000 },
      { day: 0, hour: 20, kind: 'sell', player: 1, amount: 10000 },
      { day: 1, hour: 21, kind: 'sell', player: 2, amount: 7500 },
      { day: 2, hour: 22, kind: 'prize', player: 1, amount: 6000 },
      { day: 3, hour: 19, kind: 'sell', player: 3, amount: 9000 },
      { day: 4, hour: 9, kind: 'deliver', amount: 15000 },
      { day: 4, hour: 23, kind: 'sell', player: 4, amount: 12000 },
      { day: 5, hour: 21, kind: 'prize', player: 3, amount: 4500 },
      { day: 6, hour: 20, kind: 'sell', player: 2, amount: 8000 }
    ]
  },
  {
    // Comisión baja, muchas ventas chicas, un premio grande.
    name: 'cajero_sur',
    playerPrefix: 'sur_j',
    percentage: 15,
    players: 6,
    week: [
      { day: 0, hour: 11, kind: 'deliver', amount: 30000 },
      { day: 1, hour: 18, kind: 'sell', player: 1, amount: 3000 },
      { day: 1, hour: 22, kind: 'sell', player: 2, amount: 2500 },
      { day: 2, hour: 20, kind: 'sell', player: 3, amount: 4000 },
      { day: 3, hour: 21, kind: 'sell', player: 4, amount: 5000 },
      { day: 3, hour: 23, kind: 'sell', player: 5, amount: 3500 },
      { day: 4, hour: 22, kind: 'prize', player: 4, amount: 4800 },
      { day: 5, hour: 19, kind: 'sell', player: 6, amount: 6000 },
      { day: 6, hour: 21, kind: 'sell', player: 1, amount: 2000 }
    ]
  },
  {
    // Vende poco: le quedan muchas fichas sin vender. Sin premios.
    name: 'cajero_centro',
    playerPrefix: 'centro_j',
    percentage: 25,
    players: 3,
    week: [
      { day: 1, hour: 10, kind: 'deliver', amount: 25000 },
      { day: 2, hour: 21, kind: 'sell', player: 1, amount: 5000 },
      { day: 4, hour: 20, kind: 'sell', player: 2, amount: 4000 },
      { day: 6, hour: 22, kind: 'sell', player: 3, amount: 3000 }
    ]
  }
];

/** Los 7 días previos a hoy (de hace 7 días a ayer). */
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

async function findUserId(username: string): Promise<string | null> {
  const rows = await sequelize.query<{ id: string }>(`SELECT id FROM users WHERE username = :username`, {
    replacements: { username },
    type: QueryTypes.SELECT
  });
  return rows[0]?.id ?? null;
}

/** Valores esperados de un plan, para comparar con la pestaña Liquidar. */
function expected(plan: CashierPlan) {
  const sum = (kind: Op['kind']) =>
    plan.week.filter(op => op.kind === kind).reduce((acc, op) => acc + op.amount, 0);
  const delivered = sum('deliver');
  const sales = sum('sell');
  const prizes = sum('prize');
  const commission = (sales * plan.percentage) / 100;
  const n = (value: number) => value.toLocaleString('es-AR');
  return (
    `entregadas ${n(delivered)} · venta ${n(sales)} · premios ${n(prizes)} · ` +
    `comisión ${n(commission)} · subtotal ${n(sales - commission)} · ` +
    `balance ${n(delivered - sales + prizes)} (no vendidas ${n(delivered - sales)})`
  );
}

async function seedCashier(ownerId: string, plan: CashierPlan, start: Date): Promise<boolean> {
  const username = `${PREFIX}${plan.name}`;
  if (await findUserId(username)) {
    console.log(`= ${username}: ya existe, se saltea.`);
    return false;
  }

  const cashier = await usersDomain.createUser(ownerId, {
    role: UserRole.CASHIER,
    username,
    password: PASSWORD,
    firstName: 'Demo',
    lastName: plan.name
  });

  await cashierAccountsDomain.updateCompensation(ownerId, cashier.id, {
    type: CompensationType.PERCENTAGE,
    percentage: plan.percentage
  });
  // La comisión tiene que estar vigente desde antes de la semana.
  const modeFrom = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  await sequelize.query(
    `UPDATE cashier_compensation_modes SET active_from = :from, created_at = :from
      WHERE cashier_id = :cashierId`,
    { replacements: { from: modeFrom, cashierId: cashier.id } }
  );

  const players: string[] = [];
  for (let i = 1; i <= plan.players; i += 1) {
    const player = await usersDomain.createUser(cashier.id, {
      role: UserRole.PLAYER,
      username: `${PREFIX}${plan.playerPrefix}${i}`,
      password: PASSWORD
    });
    players.push(player.id);
  }

  await runOps(ownerId, cashier.id, players, plan.week, start);

  console.log(
    `+ ${username} (${plan.percentage} %) con ${PREFIX}${plan.playerPrefix}1..${plan.players}\n    ${expected(plan)}`
  );
  return true;
}

async function seed() {
  const owner = await usersRepository.findOwner();
  if (!owner) throw new Error('No hay ningún usuario OWNER en esta base.');

  const { start, end } = week();
  let created = 0;
  for (const plan of PLANS) {
    if (await seedCashier(owner.id, plan, start)) created += 1;
  }

  console.log(`
${created === 0 ? 'No había cajeros nuevos para crear.' : `Listo: ${created} cajero(s) nuevo(s)`} bajo el owner "${owner.username}".
Movimientos del ${fmt(start)} al ${fmt(end)}. Contraseña de todos los usuarios demo: ${PASSWORD}.
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
