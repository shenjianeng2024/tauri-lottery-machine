/**
 * 抽奖系统全局状态管理Context
 * 提供统一的状态管理和操作接口
 */

import React, { createContext, useReducer, useCallback, useMemo } from 'react';
import type { LotteryState, LotteryResult } from '@/types/lottery';
import { 
  createNewCycle,
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG
} from '@/types/lottery';
import { 
  lotteryReducer, 
  initialLotteryContextState,
  selectors,
  type LotteryContextState 
} from '@/reducers/lotteryReducer';
import { 
  lotteryActions, 
  createAsyncActions,
  type LotteryAction 
} from '@/actions/lotteryActions';
import { useLotteryStorage } from '@/lib/tauri-api';
import { lotteryEngine } from '@/lib/lotteryEngine';

/**
 * Context值的接口定义
 */
export interface LotteryContextValue {
  // 状态
  state: LotteryContextState;
  
  // 基础操作
  dispatch: (action: LotteryAction) => void;
  
  // 数据操作
  loadData: () => Promise<void>;
  saveData: (lotteryState?: LotteryState) => Promise<boolean>;
  
  // 抽奖操作
  performLottery: () => Promise<LotteryResult | null>;
  initNewCycle: () => Promise<void>;
  
  // UI操作
  showHistory: () => void;
  hideHistory: () => void;
  showStats: () => void;
  hideStats: () => void;
  clearError: () => void;
  
  // 状态选择器
  canDraw: boolean;
  availablePrizes: ReturnType<typeof selectors.getAvailablePrizes>;
  cycleStats: ReturnType<typeof selectors.getCycleStats>;
  historyStats: ReturnType<typeof selectors.getHistoryStats>;
}

/**
 * Context创建
 */
export const LotteryContext = createContext<LotteryContextValue | null>(null);

/**
 * Provider组件属性
 */
export interface LotteryProviderProps {
  children: React.ReactNode;
}

/**
 * LotteryProvider组件
 * 为整个应用提供抽奖状态管理
 */
export function LotteryProvider({ children }: LotteryProviderProps) {
  const [state, dispatch] = useReducer(lotteryReducer, initialLotteryContextState);
  const { load, save } = useLotteryStorage();

  // 创建异步操作
  const asyncActions = useMemo(
    () => createAsyncActions(dispatch, () => state.lotteryState),
    [state.lotteryState]
  );

  /**
   * 加载数据
   */
  const loadData = useCallback(async (): Promise<void> => {
    await asyncActions.loadDataAsync(async () => {
      const savedData = await load();
      
      // 如果没有保存的数据，创建默认状态
      if (!savedData) {
        const defaultState = {
          currentCycle: createNewCycle(),
          history: [],
          availablePrizes: createDefaultPrizes(),
          config: DEFAULT_LOTTERY_CONFIG,
        };
        
        // 保存默认状态
        try {
          await save(defaultState);
        } catch (error) {
          console.warn('保存默认状态失败:', error);
        }
        
        return defaultState;
      }
      
      return savedData;
    });
  }, [asyncActions, load, save]);

  /**
   * 保存数据
   */
  const saveData = useCallback(async (lotteryState?: LotteryState): Promise<boolean> => {
    const stateToSave = lotteryState || state.lotteryState;
    if (!stateToSave) {
      dispatch(lotteryActions.setError('没有可保存的数据'));
      return false;
    }
    
    return await asyncActions.saveDataAsync(stateToSave, save);
  }, [asyncActions, save, state.lotteryState]);

  /**
   * 执行抽奖
   */
  const performLottery = useCallback(async (): Promise<LotteryResult | null> => {
    if (!state.lotteryState) {
      dispatch(lotteryActions.setError('抽奖状态未初始化'));
      return null;
    }

    return await asyncActions.performLotteryAsync(async (currentState) => {
      const result = await lotteryEngine.draw(currentState);
      
      // 自动保存更新后的状态
      try {
        await save(result.newState);
      } catch (error) {
        console.warn('自动保存失败:', error);
        // 不阻断抽奖流程，只记录警告
      }
      
      return result;
    });
  }, [asyncActions, state.lotteryState, save]);

  /**
   * 初始化新周期
   */
  const initNewCycle = useCallback(async (): Promise<void> => {
    if (!state.lotteryState) {
      dispatch(lotteryActions.setError('状态未初始化'));
      return;
    }

    try {
      dispatch(lotteryActions.setLoading(true));
      
      const newState = lotteryEngine.initializeNewCycle(state.lotteryState);
      dispatch(lotteryActions.initNewCycle(newState));
      
      // 保存新状态
      await save(newState);
      dispatch(lotteryActions.saveDataSuccess());
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '初始化新周期失败';
      dispatch(lotteryActions.setError(errorMessage));
    } finally {
      dispatch(lotteryActions.setLoading(false));
    }
  }, [state.lotteryState, save]);

  // UI操作函数
  const showHistory = useCallback(() => {
    dispatch(lotteryActions.showHistory());
  }, []);

  const hideHistory = useCallback(() => {
    dispatch(lotteryActions.hideHistory());
  }, []);

  const showStats = useCallback(() => {
    dispatch(lotteryActions.showStats());
  }, []);

  const hideStats = useCallback(() => {
    dispatch(lotteryActions.hideStats());
  }, []);

  const clearError = useCallback(() => {
    dispatch(lotteryActions.clearError());
  }, []);

  // 计算选择器值
  const canDraw = useMemo(() => selectors.canDraw(state), [state]);
  const availablePrizes = useMemo(() => selectors.getAvailablePrizes(state), [state]);
  const cycleStats = useMemo(() => selectors.getCycleStats(state), [state]);
  const historyStats = useMemo(() => selectors.getHistoryStats(state), [state]);

  // Context值
  const contextValue: LotteryContextValue = useMemo(() => ({
    // 状态
    state,
    
    // 基础操作
    dispatch,
    
    // 数据操作
    loadData,
    saveData,
    
    // 抽奖操作
    performLottery,
    initNewCycle,
    
    // UI操作
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
    
    // 状态选择器
    canDraw,
    availablePrizes,
    cycleStats,
    historyStats,
  }), [
    state,
    loadData,
    saveData,
    performLottery,
    initNewCycle,
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
    canDraw,
    availablePrizes,
    cycleStats,
    historyStats,
  ]);

  return (
    <LotteryContext.Provider value={contextValue}>
      {children}
    </LotteryContext.Provider>
  );
}

/**
 * 错误边界组件
 * 捕获Context相关的错误
 */
export class LotteryErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LotteryContext错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />;
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-4xl">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600">应用出现错误</h2>
            <p className="text-muted-foreground max-w-md">
              抽奖系统遇到了问题，请刷新页面重试。如果问题持续存在，请联系技术支持。
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LotteryContext;