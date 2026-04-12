const ROUTER = {
  SITE: "/",
  LOGIN: "/login",

  // Admin routes (OWNER, ADMIN)
  ADMIN: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_GAMES: "/admin/games",
  ADMIN_BALANCES: "/admin/balances",
  ADMIN_TRANSACTIONS: "/admin/transactions",
  ADMIN_REPORTS: "/admin/reports",
  ADMIN_SETTINGS: "/admin/settings",
  EDIT_USER: "/admin/users/edit-user",
  CREATE_USER: "/admin/users/create-user",
  CREATE_ADMIN: "/admin/users/create-admin",
  CREATE_MANAGER: "/admin/users/create-manager",
  CREATE_CASHIER: "/admin/users/create-cashier",

  // Cashier routes
  CASHIER_DASHBOARD: "/cashier/dashboard",
  CASHIER_SELL_CHIPS: "/cashier/sell",
  CASHIER_TRANSACTIONS: "/cashier/transactions",

  // Player routes
  USER_GAME_PLAY: "/user/games",
  USER_DASHBOARD: "/user/dashboard",
  USER_BETS: "/user/bets",
  USER_PROFILE: "/user/profile",
  USER_TRANSACTIONS: "/user/transactions",
  USER_SETTINGS: "/user/settings",
}

export default ROUTER