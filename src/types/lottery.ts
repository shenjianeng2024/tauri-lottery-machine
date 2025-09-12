/**
 * 抽奖游戏核心数据模型定义
 * 
 * 定义三色礼品抽奖游戏的基础数据结构，支持周期性抽奖逻辑
 */

/**
 * 奖品颜色枚举
 * 游戏支持红、黄、绿三种颜色的奖品
 */
export enum PrizeColor {
  Red = 'red',
  Yellow = 'yellow', 
  Green = 'green'
}

/**
 * 奖品基础信息接口
 */
export interface Prize {
  /** 奖品唯一标识 */
  id: string;
  /** 奖品颜色 */
  color: PrizeColor;
  /** 奖品名称 */
  name: string;
  /** 奖品描述（可选） */
  description?: string;
  /** 奖品图标或图片路径（可选） */
  icon?: string;
}

/**
 * 抽奖结果接口
 * 记录单次抽奖的详细信息
 */
export interface LotteryResult {
  /** 中奖奖品ID */
  prizeId: string;
  /** 抽奖时间戳 */
  timestamp: number;
  /** 所属周期ID */
  cycleId: string;
  /** 在当前周期中的抽奖序号（1-6） */
  drawNumber: number;
}

/**
 * 抽奖周期接口
 * 每个周期包含6次抽奖，每种颜色恰好2次
 */
export interface LotteryCycle {
  /** 周期唯一标识 */
  id: string;
  /** 周期开始时间 */
  startTime: number;
  /** 周期结束时间（完成时设置） */
  endTime?: number;
  /** 当前周期的抽奖结果列表 */
  results: LotteryResult[];
  /** 周期是否已完成 */
  completed: boolean;
  /** 剩余每种颜色的抽奖次数 */
  remainingDraws: {
    [PrizeColor.Red]: number;
    [PrizeColor.Yellow]: number;
    [PrizeColor.Green]: number;
  };
}

/**
 * 抽奖系统整体状态接口
 */
export interface LotteryState {
  /** 当前进行中的周期 */
  currentCycle: LotteryCycle;
  /** 历史已完成周期列表 */
  history: LotteryCycle[];
  /** 可用奖品列表 */
  availablePrizes: Prize[];
  /** 系统配置 */
  config: LotteryConfig;
}

/**
 * 抽奖系统配置接口
 */
export interface LotteryConfig {
  /** 每个周期的抽奖总次数 */
  drawsPerCycle: number;
  /** 每种颜色在每个周期中的抽奖次数 */
  drawsPerColor: number;
  /** 是否启用动画效果 */
  enableAnimations: boolean;
  /** 动画持续时间（毫秒） */
  animationDuration: number;
}

/**
 * 抽奖引擎接口
 * 定义核心抽奖逻辑的契约
 */
export interface LotteryEngine {
  /**
   * 执行一次抽奖
   * @param state 当前抽奖状态
   * @returns 更新后的状态和抽奖结果
   */
  draw(state: LotteryState): Promise<{
    newState: LotteryState;
    result: LotteryResult;
  }>;

  /**
   * 初始化新的抽奖周期
   * @param state 当前状态
   * @returns 包含新周期的更新状态
   */
  initializeNewCycle(state: LotteryState): LotteryState;

  /**
   * 检查当前周期是否可以进行抽奖
   * @param cycle 当前周期
   * @returns 是否可以抽奖
   */
  canDraw(cycle: LotteryCycle): boolean;

  /**
   * 获取当前周期的进度信息
   * @param cycle 当前周期
   * @returns 进度信息
   */
  getCycleProgress(cycle: LotteryCycle): CycleProgress;
}

/**
 * 周期进度信息接口
 */
export interface CycleProgress {
  /** 已完成的抽奖次数 */
  completedDraws: number;
  /** 总抽奖次数 */
  totalDraws: number;
  /** 完成百分比 */
  percentage: number;
  /** 各颜色剩余次数 */
  remainingByColor: {
    [PrizeColor.Red]: number;
    [PrizeColor.Yellow]: number;
    [PrizeColor.Green]: number;
  };
}

/**
 * 抽奖错误类型
 */
export class LotteryError extends Error {
  public code: LotteryErrorCode;
  public details?: Record<string, unknown>;
  
  constructor(
    message: string,
    code: LotteryErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.details = details;
    super(message);
    this.name = 'LotteryError';
  }
}

/**
 * 抽奖错误代码枚举
 */
export enum LotteryErrorCode {
  CYCLE_COMPLETED = 'CYCLE_COMPLETED',
  NO_AVAILABLE_PRIZES = 'NO_AVAILABLE_PRIZES', 
  INVALID_STATE = 'INVALID_STATE',
  DRAW_LIMIT_REACHED = 'DRAW_LIMIT_REACHED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * 默认抽奖配置
 */
export const DEFAULT_LOTTERY_CONFIG: LotteryConfig = {
  drawsPerCycle: 6,
  drawsPerColor: 2,
  enableAnimations: true,
  animationDuration: 2000, // 2秒
};

/**
 * 创建新周期的工具函数
 */
export function createNewCycle(): LotteryCycle {
  const now = Date.now();
  return {
    id: `cycle_${now}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: now,
    results: [],
    completed: false,
    remainingDraws: {
      [PrizeColor.Red]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
      [PrizeColor.Yellow]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
      [PrizeColor.Green]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
    },
  };
}

/**
 * 创建默认奖品列表的工具函数
 */
export function createDefaultPrizes(): Prize[] {
  return [
    {
      id: 'prize_red_1',
      color: PrizeColor.Red,
      name: '红色大奖',
      description: '价值丰厚的红色奖品'
    },
    {
      id: 'prize_red_2', 
      color: PrizeColor.Red,
      name: '红色好礼',
      description: '精美的红色礼品'
    },
    {
      id: 'prize_yellow_1',
      color: PrizeColor.Yellow,
      name: '黄色大奖',
      description: '价值丰厚的黄色奖品'
    },
    {
      id: 'prize_yellow_2',
      color: PrizeColor.Yellow, 
      name: '黄色好礼',
      description: '精美的黄色礼品'
    },
    {
      id: 'prize_green_1',
      color: PrizeColor.Green,
      name: '绿色大奖',
      description: '价值丰厚的绿色奖品'
    },
    {
      id: 'prize_green_2',
      color: PrizeColor.Green,
      name: '绿色好礼',
      description: '精美的绿色礼品'
    },
  ];
}