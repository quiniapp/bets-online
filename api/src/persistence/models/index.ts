import UserModel from '../../features/users/user.model';
import BalanceModel from '../../features/chips/balance.model';
import SessionModel from '../../features/auth/session.model';
import ChipMovementModel from '../../features/chips/chip-movement.model';
import CashierCompensationModeModel from '../../features/chips/cashier-compensation-mode.model';
import CashierSettlementModel from '../../features/chips/cashier-settlement.model';
import ChipPanelModel from '../../features/chips/chip-panel.model';
import RecoveryModel from '../../features/auth/recovery.model';
import UserGameProviderBlocklistModel from '../../features/users/user-game-provider-blocklist.model';
import AuditLogModel from '../../features/users/audit-log.model';
import GameModel from '../../features/games/game.model';
import BetModel from '../../features/bets/bet.model';
import UserProviderProfileModel from '../../features/integrations/21viral/UserProviderProfile.model';
import ProviderTransactionModel from '../../features/integrations/21viral/ProviderTransaction.model';
import ProviderModel from '../../features/providers/provider.model';
import GameTypeModel from '../../features/game-types/game-type.model';
import UserFavoriteGameModel from '../../features/favorites/UserFavoriteGame.model';
import FeaturedGameModel from '../../features/featured-games/featured-game.model';
import GameBannerModel from '../../features/game-banners/game-banner.model';
import GameImageModel from '../../features/game-images/game-image.model';
import CasinoSettingsModel from '../../features/settings/casino-settings.model';
import ProviderGameTypeOrderModel from '../../features/provider-type-orders/provider-game-type-order.model';

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

// User -> CasinoSettings (1:1)
UserModel.hasOne(CasinoSettingsModel, { foreignKey: 'ownerId', as: 'casinoSettings' });
CasinoSettingsModel.belongsTo(UserModel, { foreignKey: 'ownerId', as: 'owner' });

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
// FAVORITE GAMES ASSOCIATIONS
// ===================================

UserModel.hasMany(UserFavoriteGameModel, {
  foreignKey: 'userId',
  as: 'favoriteGames'
});

UserFavoriteGameModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

GameModel.hasMany(UserFavoriteGameModel, {
  foreignKey: 'gameId',
  as: 'favoritedBy'
});

UserFavoriteGameModel.belongsTo(GameModel, {
  foreignKey: 'gameId',
  as: 'game'
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

// GameModel -> FeaturedGameModel (1:N)
GameModel.hasMany(FeaturedGameModel, {
  foreignKey: 'gameId',
  as: 'featuredEntries'
});
FeaturedGameModel.belongsTo(GameModel, {
  foreignKey: 'gameId',
  as: 'game'
});

// GameModel -> GameBannerModel (1:N)
GameModel.hasMany(GameBannerModel, {
  foreignKey: 'gameId',
  as: 'bannerEntries'
});
GameBannerModel.belongsTo(GameModel, {
  foreignKey: 'gameId',
  as: 'game'
});

// GameModel -> GameImageModel (1:N)
GameModel.hasMany(GameImageModel, {
  foreignKey: 'gameId',
  as: 'gameImages'
});
GameImageModel.belongsTo(GameModel, {
  foreignKey: 'gameId',
  as: 'game'
});

// ===================================
// PROVIDER ASSOCIATIONS
// ===================================

// User -> UserProviderProfiles (1:N)
UserModel.hasMany(UserProviderProfileModel, {
  foreignKey: 'userId',
  as: 'providerProfiles'
});

UserProviderProfileModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

// User -> ProviderTransactions (1:N)
UserModel.hasMany(ProviderTransactionModel, {
  foreignKey: 'userId',
  as: 'providerTransactions'
});

ProviderTransactionModel.belongsTo(UserModel, {
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
  BetModel,
  UserProviderProfileModel,
  ProviderTransactionModel,
  ProviderModel,
  GameTypeModel,
  UserFavoriteGameModel,
  FeaturedGameModel,
  GameBannerModel,
  GameImageModel,
  CasinoSettingsModel,
  ProviderGameTypeOrderModel
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
  BetModel,
  UserProviderProfileModel,
  ProviderTransactionModel,
  ProviderModel,
  GameTypeModel,
  UserFavoriteGameModel,
  FeaturedGameModel,
  GameBannerModel,
  GameImageModel,
  CasinoSettingsModel,
  ProviderGameTypeOrderModel
};
