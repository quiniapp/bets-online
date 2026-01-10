import { Game } from 'helper';

export interface GameResultData {
  gameType: string;
  randomValue: number;
  winProbability: number;
  timestamp: string;
  houseEdge: number;
  [key: string]: unknown;
}

export interface SimulationResult {
  isWin: boolean;
  multiplier: number;
  resultData: GameResultData;
}

export class GameSimulationService {
  /**
   * Simulate a game round based on house edge
   * House edge determines the probability of player winning
   *
   * Example:
   * - House edge 0% = 50/50 chance (fair coin flip)
   * - House edge 2.5% = 48.75% player win rate
   * - House edge 5% = 47.5% player win rate
   *
   * @param game The game to simulate
   * @returns Simulation result with win status, multiplier, and result data
   */
  simulateGameRound(game: Game): SimulationResult {
    // Convert house edge to win probability
    // Formula: win probability = (100 - house edge) / 100
    const winProbability = (100 - game.houseEdge) / 100;

    // Generate random number between 0 and 1
    const randomValue = Math.random();

    // Determine if player wins
    const isWin = randomValue < winProbability;

    if (isWin) {
      // Generate multiplier for wins
      const multiplier = this.generateWinMultiplier(game);

      return {
        isWin: true,
        multiplier,
        resultData: {
          gameType: game.name,
          randomValue: Math.round(randomValue * 10000) / 10000, // 4 decimal places
          winProbability: Math.round(winProbability * 10000) / 10000,
          timestamp: new Date().toISOString(),
          houseEdge: game.houseEdge
        },
      };
    } else {
      return {
        isWin: false,
        multiplier: 0,
        resultData: {
          gameType: game.name,
          randomValue: Math.round(randomValue * 10000) / 10000,
          winProbability: Math.round(winProbability * 10000) / 10000,
          timestamp: new Date().toISOString(),
          houseEdge: game.houseEdge
        },
      };
    }
  }

  /**
   * Generate win multiplier based on game configuration
   * Higher house edge games can have bigger multipliers
   *
   * Formula:
   * - Base multiplier = 1 + (house edge / 10)
   * - Random factor = 1.2 to 3.0
   * - Final multiplier = base * random factor
   *
   * Examples:
   * - House edge 2.5% → base 1.25 → range 1.5x to 3.75x
   * - House edge 5.0% → base 1.50 → range 1.8x to 4.5x
   *
   * @param game The game configuration
   * @returns Multiplier value (rounded to 2 decimal places)
   */
  private generateWinMultiplier(game: Game): number {
    // Base multiplier increases with house edge
    // This compensates for lower win probability
    const baseMultiplier = 1 + (game.houseEdge / 10);

    // Add randomness (1.2x to 3x of base)
    const randomFactor = 1.2 + Math.random() * 1.8;

    // Calculate final multiplier
    const multiplier = baseMultiplier * randomFactor;

    // Round to 2 decimal places
    return Math.round(multiplier * 100) / 100;
  }

  /**
   * Validate bet amount against game limits
   *
   * @param amount Bet amount
   * @param game Game configuration
   * @returns true if bet amount is valid, false otherwise
   */
  validateBetAmount(amount: number, game: Game): boolean {
    return amount >= game.minBet && amount <= game.maxBet;
  }

  /**
   * Calculate payout for a winning bet
   *
   * @param betAmount Original bet amount
   * @param multiplier Win multiplier
   * @returns Payout amount (rounded to 2 decimal places)
   */
  calculatePayout(betAmount: number, multiplier: number): number {
    return Math.round(betAmount * multiplier * 100) / 100;
  }

  /**
   * Calculate expected return percentage for a game
   * This helps understand the long-term expected value
   *
   * @param game Game configuration
   * @returns Expected return percentage (0-100)
   */
  calculateExpectedReturn(game: Game): number {
    // Expected return = 100% - house edge
    return 100 - game.houseEdge;
  }

  /**
   * Simulate multiple rounds for testing/analysis
   * Useful for verifying house edge is working correctly
   *
   * @param game Game to simulate
   * @param rounds Number of rounds to simulate
   * @returns Statistics object
   */
  simulateMultipleRounds(game: Game, rounds: number = 1000) {
    let wins = 0;
    let totalPayout = 0;
    const totalWagered = rounds; // Assuming $1 bets

    for (let i = 0; i < rounds; i++) {
      const result = this.simulateGameRound(game);
      if (result.isWin) {
        wins++;
        totalPayout += this.calculatePayout(1, result.multiplier);
      }
    }

    return {
      rounds,
      wins,
      losses: rounds - wins,
      winRate: (wins / rounds) * 100,
      expectedWinRate: (100 - game.houseEdge),
      totalWagered,
      totalPayout,
      netProfit: totalPayout - totalWagered,
      actualHouseEdge: ((totalWagered - totalPayout) / totalWagered) * 100
    };
  }
}

export const gameSimulationService = new GameSimulationService();
