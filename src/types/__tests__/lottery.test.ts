/**
 * 抽奖游戏数据模型单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PrizeColor,
  Prize,
  LotteryResult,
  LotteryCycle,
  LotteryState,
  LotteryError,
  LotteryErrorCode,
  DEFAULT_LOTTERY_CONFIG,
  createNewCycle,
  createDefaultPrizes,
} from '../lottery';

describe('PrizeColor', () => {
  it('should define correct color values', () => {
    expect(PrizeColor.Red).toBe('red');
    expect(PrizeColor.Yellow).toBe('yellow');
    expect(PrizeColor.Blue).toBe('blue');
  });
});

describe('createNewCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow(1609459200000); // 2021-01-01 00:00:00
  });

  it('should create a new cycle with correct initial state', () => {
    const cycle = createNewCycle();

    expect(cycle).toMatchObject({
      startTime: 1609459200000,
      results: [],
      completed: false,
      remainingDraws: {
        [PrizeColor.Red]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
        [PrizeColor.Yellow]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
        [PrizeColor.Blue]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
      },
    });

    expect(cycle.id).toMatch(/^cycle_1609459200000_/);
    expect(cycle.endTime).toBeUndefined();
  });

  it('should generate unique cycle IDs', () => {
    // Mock Math.random to return different values
    const originalRandom = Math.random;
    let callCount = 0;
    Math.random = vi.fn(() => {
      callCount++;
      return callCount * 0.1;
    });

    const cycle1 = createNewCycle();
    const cycle2 = createNewCycle();

    expect(cycle1.id).not.toBe(cycle2.id);

    Math.random = originalRandom;
  });
});

describe('createDefaultPrizes', () => {
  it('should create 6 default prizes', () => {
    const prizes = createDefaultPrizes();
    expect(prizes).toHaveLength(6);
  });

  it('should create 2 prizes for each color', () => {
    const prizes = createDefaultPrizes();
    
    const redPrizes = prizes.filter(p => p.color === PrizeColor.Red);
    const yellowPrizes = prizes.filter(p => p.color === PrizeColor.Yellow);
    const bluePrizes = prizes.filter(p => p.color === PrizeColor.Blue);

    expect(redPrizes).toHaveLength(2);
    expect(yellowPrizes).toHaveLength(2);
    expect(bluePrizes).toHaveLength(2);
  });

  it('should have unique IDs for all prizes', () => {
    const prizes = createDefaultPrizes();
    const ids = prizes.map(p => p.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(prizes.length);
  });

  it('should have correct prize structure', () => {
    const prizes = createDefaultPrizes();
    
    prizes.forEach(prize => {
      expect(prize).toHaveProperty('id');
      expect(prize).toHaveProperty('color');
      expect(prize).toHaveProperty('name');
      expect(prize).toHaveProperty('description');
      
      expect(typeof prize.id).toBe('string');
      expect(typeof prize.name).toBe('string');
      expect(typeof prize.description).toBe('string');
      expect(Object.values(PrizeColor)).toContain(prize.color);
    });
  });
});

describe('LotteryError', () => {
  it('should create error with correct properties', () => {
    const error = new LotteryError(
      'Test error message',
      LotteryErrorCode.CYCLE_COMPLETED,
      { cycleId: 'test-cycle' }
    );

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(LotteryErrorCode.CYCLE_COMPLETED);
    expect(error.details).toEqual({ cycleId: 'test-cycle' });
    expect(error.name).toBe('LotteryError');
  });

  it('should work without details', () => {
    const error = new LotteryError(
      'Simple error',
      LotteryErrorCode.INVALID_STATE
    );

    expect(error.message).toBe('Simple error');
    expect(error.code).toBe(LotteryErrorCode.INVALID_STATE);
    expect(error.details).toBeUndefined();
  });
});

describe('DEFAULT_LOTTERY_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_LOTTERY_CONFIG).toEqual({
      drawsPerCycle: 6,
      drawsPerColor: 2,
      enableAnimations: true,
      animationDuration: 2000,
    });
  });
});

describe('Type validation tests', () => {
  it('should accept valid Prize objects', () => {
    const validPrize: Prize = {
      id: 'test-prize',
      color: PrizeColor.Red,
      name: 'Test Prize',
      description: 'A test prize',
      icon: 'test-icon.png',
    };

    expect(validPrize.id).toBe('test-prize');
    expect(validPrize.color).toBe(PrizeColor.Red);
    expect(validPrize.name).toBe('Test Prize');
    expect(validPrize.description).toBe('A test prize');
    expect(validPrize.icon).toBe('test-icon.png');
  });

  it('should accept valid LotteryResult objects', () => {
    const validResult: LotteryResult = {
      prizeId: 'prize-123',
      timestamp: 1609459200000,
      cycleId: 'cycle-456',
      drawNumber: 3,
    };

    expect(validResult.prizeId).toBe('prize-123');
    expect(validResult.timestamp).toBe(1609459200000);
    expect(validResult.cycleId).toBe('cycle-456');
    expect(validResult.drawNumber).toBe(3);
  });

  it('should accept valid LotteryCycle objects', () => {
    const validCycle: LotteryCycle = {
      id: 'cycle-789',
      startTime: 1609459200000,
      endTime: 1609459800000,
      results: [],
      completed: false,
      remainingDraws: {
        [PrizeColor.Red]: 2,
        [PrizeColor.Yellow]: 2,
        [PrizeColor.Blue]: 2,
      },
    };

    expect(validCycle.id).toBe('cycle-789');
    expect(validCycle.startTime).toBe(1609459200000);
    expect(validCycle.endTime).toBe(1609459800000);
    expect(validCycle.results).toEqual([]);
    expect(validCycle.completed).toBe(false);
    expect(validCycle.remainingDraws).toEqual({
      [PrizeColor.Red]: 2,
      [PrizeColor.Yellow]: 2,
      [PrizeColor.Blue]: 2,
    });
  });
});

describe('Data integrity tests', () => {
  it('should maintain referential integrity between results and cycles', () => {
    const cycle = createNewCycle();
    const result: LotteryResult = {
      prizeId: 'prize-1',
      timestamp: Date.now(),
      cycleId: cycle.id,
      drawNumber: 1,
    };

    // 结果应该引用正确的周期ID
    expect(result.cycleId).toBe(cycle.id);
  });

  it('should maintain color mapping consistency', () => {
    const prizes = createDefaultPrizes();
    
    // 每个奖品的颜色应该在其ID中体现
    prizes.forEach(prize => {
      if (prize.color === PrizeColor.Red) {
        expect(prize.id).toContain('red');
      } else if (prize.color === PrizeColor.Yellow) {
        expect(prize.id).toContain('yellow');
      } else if (prize.color === PrizeColor.Blue) {
        expect(prize.id).toContain('blue');
      }
    });
  });
});