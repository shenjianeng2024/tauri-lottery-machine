/**
 * 抽奖系统Context钩子
 * 提供便捷的状态访问和操作方法
 */

import { useContext } from 'react';
import { LotteryContext, type LotteryContextValue } from '@/context/LotteryContext';

/**
 * 使用抽奖Context的主钩子
 * 提供类型安全的Context访问
 */
export function useLotteryContext(): LotteryContextValue {
  const context = useContext(LotteryContext);
  
  if (!context) {
    throw new Error('useLotteryContext必须在LotteryProvider内部使用');
  }
  
  return context;
}

/**
 * 只获取抽奖状态的钩子
 * 用于只需要读取状态的组件，避免不必要的重渲染
 */
export function useLotteryState() {
  const { state } = useLotteryContext();
  return state;
}

/**
 * 只获取抽奖操作的钩子
 * 用于只需要操作功能的组件
 */
export function useLotteryActions() {
  const {
    dispatch,
    loadData,
    saveData,
    performLottery,
    initNewCycle,
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
  } = useLotteryContext();
  
  return {
    dispatch,
    loadData,
    saveData,
    performLottery,
    initNewCycle,
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
  };
}

/**
 * 获取抽奖状态选择器的钩子
 * 提供计算后的状态信息
 */
export function useLotterySelectors() {
  const {
    canDraw,
    availablePrizes,
    cycleStats,
    historyStats,
  } = useLotteryContext();
  
  return {
    canDraw,
    availablePrizes,
    cycleStats,
    historyStats,
  };
}

/**
 * 获取当前周期进度的钩子
 * 专门用于进度显示组件
 */
export function useCycleProgress() {
  const { state } = useLotteryContext();
  return {
    progress: state.currentCycleProgress,
    isAnimating: state.isAnimating,
    recentResult: state.recentResult,
  };
}

/**
 * 获取UI状态的钩子
 * 用于控制界面显示状态
 */
export function useLotteryUI() {
  const { state, showHistory, hideHistory, showStats, hideStats, clearError } = useLotteryContext();
  
  return {
    // 状态
    isLoading: state.isLoading,
    isAnimating: state.isAnimating,
    error: state.error,
    showHistory: state.showHistory,
    showStats: state.showStats,
    
    // 操作
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
  };
}

/**
 * 抽奖操作钩子
 * 专门处理抽奖相关操作
 */
export function useLotteryDraw() {
  const { 
    performLottery, 
    canDraw, 
    availablePrizes,
    state 
  } = useLotteryContext();
  
  return {
    // 操作
    performLottery,
    
    // 状态
    canDraw,
    isAnimating: state.isAnimating,
    availablePrizes,
    recentResult: state.recentResult,
  };
}

/**
 * 周期管理钩子
 * 处理周期相关操作
 */
export function useCycleManagement() {
  const { 
    initNewCycle, 
    cycleStats,
    state 
  } = useLotteryContext();
  
  return {
    // 操作
    initNewCycle,
    
    // 状态
    cycleStats,
    currentCycle: state.lotteryState?.currentCycle,
    isLoading: state.isLoading,
  };
}

/**
 * 数据管理钩子
 * 处理数据加载和保存
 */
export function useLotteryData() {
  const { 
    loadData, 
    saveData, 
    state,
    clearError 
  } = useLotteryContext();
  
  return {
    // 操作
    loadData,
    saveData,
    clearError,
    
    // 状态
    lotteryState: state.lotteryState,
    isLoading: state.isLoading,
    error: state.error,
  };
}

/**
 * 历史记录钩子
 * 处理历史记录相关功能
 */
export function useLotteryHistory() {
  const { 
    state, 
    historyStats,
    showHistory, 
    hideHistory 
  } = useLotteryContext();
  
  return {
    // 操作
    showHistory,
    hideHistory,
    
    // 状态
    history: state.lotteryState?.history || [],
    currentCycle: state.lotteryState?.currentCycle,
    historyStats,
    showHistoryModal: state.showHistory,
  };
}

/**
 * 统计信息钩子
 * 处理统计相关功能
 */
export function useLotteryStats() {
  const { 
    cycleStats,
    historyStats,
    showStats, 
    hideStats,
    state 
  } = useLotteryContext();
  
  return {
    // 操作
    showStats,
    hideStats,
    
    // 状态
    cycleStats,
    historyStats,
    showStatsModal: state.showStats,
    lotteryState: state.lotteryState,
  };
}

/**
 * 错误处理钩子
 * 专门处理错误状态
 */
export function useLotteryError() {
  const { state, clearError } = useLotteryContext();
  
  return {
    error: state.error,
    hasError: !!state.error,
    clearError,
  };
}

export default useLotteryContext;