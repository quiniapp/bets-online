import UserModel from './user.model';
import BalanceModel from './balance.model';
import SessionModel from './session.model';
import ChipMovementModel from './chip-movement.model';
import CashierCompensationModeModel from './cashier-compensation-mode.model';
import CashierSettlementModel from './cashier-settlement.model';
import ChipPanelModel from './chip-panel.model';
import RecoveryModel from './recovery.model';
import UserGameProviderBlocklistModel from './user-game-provider-blocklist.model';
import AuditLogModel from './audit-log.model';
import GameModel from './game.model';
import BetModel from './bet.model';

// ===================================
// USER ASSOCIATIONS
// ===================================

// User -> Balance (1:1)
UserModel.hasOne(BalanceModel, {
  foreignKey: 'userId',
  as: 'balance'
});

BalanceModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

// User -> Sessions (1:N)
UserModel.hasMany(SessionModel, {
  foreignKey: 'userId',
  as: 'sessions'
});

SessionModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

// User -> ChipMovements (1:N)
UserModel.hasMany(ChipMovementModel, {
  foreignKey: 'userId',
  as: 'chipMovements'
});

ChipMovementModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

// User -> Related ChipMovements (1:N)
ChipMovementModel.belongsTo(UserModel, {
  foreignKey: 'relatedUserId',
  as: 'relatedUser'
});

// User -> CashierCompensationModes (1:N)
UserModel.hasMany(CashierCompensationModeModel, {
  foreignKey: 'cashierId',
  as: 'compensationModes'
});

CashierCompensationModeModel.belongsTo(UserModel, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

// User -> CashierSettlements (1:N)
UserModel.hasMany(CashierSettlementModel, {
  foreignKey: 'cashierId',
  as: 'settlements'
});

CashierSettlementModel.belongsTo(UserModel, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

// User -> ChipPanels (1:N)
UserModel.hasMany(ChipPanelModel, {
  foreignKey: 'cashierId',
  as: 'chipPanels'
});

ChipPanelModel.belongsTo(UserModel, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

// User -> Recoveries as Admin (1:N)
UserModel.hasMany(RecoveryModel, {
  foreignKey: 'adminId',
  as: 'recoveriesAsAdmin'
});

RecoveryModel.belongsTo(UserModel, {
  foreignKey: 'adminId',
  as: 'admin'
});

// User -> Recoveries as Cashier (1:N)
UserModel.hasMany(RecoveryModel, {
  foreignKey: 'cashierId',
  as: 'recoveriesAsCashier'
});

RecoveryModel.belongsTo(UserModel, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

// User -> UserGameProviderBlocklist (1:N)
UserModel.hasMany(UserGameProviderBlocklistModel, {
  foreignKey: 'userId',
  as: 'blockedProviders'
});

UserGameProviderBlocklistModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

// User -> UserGameProviderBlocklist as Blocker (1:N)
UserGameProviderBlocklistModel.belongsTo(UserModel, {
  foreignKey: 'blockedBy',
  as: 'blocker'
});

// User -> AuditLogs (1:N)
UserModel.hasMany(AuditLogModel, {
  foreignKey: 'userId',
  as: 'auditLogs'
});

AuditLogModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

// ===================================
// USER HIERARCHY (Self-referential)
// ===================================

UserModel.hasMany(UserModel, {
  foreignKey: 'parentUserId',
  as: 'children'
});

UserModel.belongsTo(UserModel, {
  foreignKey: 'parentUserId',
  as: 'parent'
});

// ===================================
// RECOVERY ASSOCIATIONS
// ===================================

// Recovery -> ChipMovement (N:1)
RecoveryModel.belongsTo(ChipMovementModel, {
  foreignKey: 'relatedMovementId',
  as: 'relatedMovement'
});

ChipMovementModel.hasMany(RecoveryModel, {
  foreignKey: 'relatedMovementId',
  as: 'recoveries'
});

// ===================================
// GAME AND BET ASSOCIATIONS
// ===================================

// Game -> Bets (1:N)
GameModel.hasMany(BetModel, {
  foreignKey: 'gameId',
  as: 'bets'
});

BetModel.belongsTo(GameModel, {
  foreignKey: 'gameId',
  as: 'game'
});

// User -> Bets (1:N)
UserModel.hasMany(BetModel, {
  foreignKey: 'userId',
  as: 'bets'
});

BetModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

// ===================================
// EXPORTS
// ===================================

export {
  UserModel,
  BalanceModel,
  SessionModel,
  ChipMovementModel,
  CashierCompensationModeModel,
  CashierSettlementModel,
  ChipPanelModel,
  RecoveryModel,
  UserGameProviderBlocklistModel,
  AuditLogModel,
  GameModel,
  BetModel
};

export default {
  UserModel,
  BalanceModel,
  SessionModel,
  ChipMovementModel,
  CashierCompensationModeModel,
  CashierSettlementModel,
  ChipPanelModel,
  RecoveryModel,
  UserGameProviderBlocklistModel,
  AuditLogModel,
  GameModel,
  BetModel
};
