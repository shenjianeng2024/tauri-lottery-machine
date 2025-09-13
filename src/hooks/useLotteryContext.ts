/**
 * Context钩子的统一导出
 * 提供类型安全的抽奖功能访问
 */

import { useContext } from 'react';
import { LotteryContext } from '@/context/LotteryContext';

/**
 * 主要的抽奖Context钩子
 * 提供完整的抽奖状态和操作方法
 */
export function useLotteryContext() {
  const context = useContext(LotteryContext);
  
  if (!context) {
    throw new Error('useLotteryContext must be used within a LotteryProvider');
  }
  
  return context;
}

/**
 * 获取抽奖数据的钩子
 * 专门用于数据相关操作，不包含UI状态
 */
export function useLotteryData() {
  const { state, loadData, saveData, resetData } = useLotteryContext();
  
  return {
    lotteryState: state.lotteryState,
    isLoading: state.isLoading,
    error: state.error,
    loadData,
    saveData,
    resetData,
  };
}

/**
 * 获取抽奖操作的钩子
 * 专门处理抽奖动作相关功能
 */
export function useLotteryActions() {
  const { 
    state, 
    performLottery, 
    canDraw, 
    resetCycle,
    lastResult,
    cycleStats 
  } = useLotteryContext();
  
  return {
    lotteryState: state.lotteryState,
    isAnimating: state.isAnimating,
    canDraw,
    performLottery,
    resetCycle,
    lastResult,
    cycleStats,
  };
}

/**
 * 获取历史记录的钩子
 * 用于历史数据查看和管理
 */
export function useLotteryHistory() {
  const { state, getHistory, exportData } = useLotteryContext();
  
  return {
    history: getHistory(),
    lotteryState: state.lotteryState,
    exportData,
  };
}

/**
 * 获取统计信息的钩子
 * 用于数据分析和展示
 */
export function useLotteryStats() {
  const { state, getStats, cycleStats } = useLotteryContext();
  
  return {
    stats: getStats(),
    cycleStats,
    lotteryState: state.lotteryState,
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
    isHistoryVisible: state.showHistory,
    isStatsVisible: state.showStats,
    
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
    state, 
    performLottery, 
    canDraw, 
    lastResult,
    cycleStats 
  } = useLotteryContext();
  
  return {
    canDraw,
    isAnimating: state.isAnimating,
    performLottery,
    lastResult,
    cycleStats,
  };
}

/**
 * 周期管理钩子
 * 处理抽奖周期相关操作
 */
export function useLotteryCycle() {
  const { 
    state, 
    resetCycle, 
    cycleStats,
    getProgress 
  } = useLotteryContext();
  
  return {
    currentCycle: state.lotteryState?.currentCycle,
    cycleStats,
    progress: getProgress(),
    resetCycle,
  };
}

/**
 * 错误处理钩子
 * 专门处理错误状态管理
 */
export function useLotteryError() {
  const { state, clearError } = useLotteryContext();
  
  return {
    error: state.error,
    hasError: !!state.error,
    clearError,
  };
}