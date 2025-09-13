/**
 * 性能优化版老虎机动画组件
 * 集成错误边界、性能监控和自动调优功能
 */

import React, { 
  useEffect, 
  useState, 
  useMemo, 
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PrizeDisplay, PrizeDisplayState } from '@/components/lottery/PrizeDisplay';
import { AnimationErrorBoundary } from '@/components/error/ErrorBoundary';
import { 
  useOptimizedAnimationFrame,
  useOptimizedState,
  usePerformanceMonitoring,
  useGPUAcceleration,
  autoTunePerformance,
  DEFAULT_PERFORMANCE_CONFIG,
  type PerformanceConfig
} from '@/lib/performanceOptimization';
import { useErrorReporting } from '@/lib/errorReporting';
import type { Prize } from '@/types/lottery';

/**
 * 优化的SlotMachine组件属性接口
 */
export interface OptimizedSlotMachineProps {
  /** 奖品列表 */
  prizes: Prize[];
  /** 是否启用动画 */
  enabled?: boolean;
  /** 动画完成回调 */
  onAnimationComplete?: (prizeId: string) => void;
  /** 动画开始回调 */
  onAnimationStart?: () => void;
  /** 性能配置变更回调 */
  onPerformanceChange?: (metrics: { fps: number; memoryUsage: number }) => void;
  /** 自定义样式类名 */
  className?: string;
  /** 网格列数 */
  columns?: number;
  /** 性能模式 */
  performanceMode?: 'high' | 'normal' | 'low' | 'auto';
  /** 自定义性能配置 */
  performanceConfig?: Partial<PerformanceConfig>;
  /** 启用自动性能调优 */
  autoTune?: boolean;
}

/**
 * SlotMachine组件引用接口
 */
export interface OptimizedSlotMachineRef {
  startAnimation: (targetPrizeId: string) => Promise<void>;
  stopAnimation: () => void;
  getCurrentMetrics: () => { fps: number; memoryUsage: number };
  updatePerformanceConfig: (config: Partial<PerformanceConfig>) => void;
}

/**
 * 动画阶段枚举
 */
export const OptimizedAnimationPhase = {
  Idle: 'idle',
  Prepare: 'prepare',
  Spinning: 'spinning',
  Stopping: 'stopping',
  Result: 'result',
  Error: 'error'
} as const;

export type OptimizedAnimationPhase = typeof OptimizedAnimationPhase[keyof typeof OptimizedAnimationPhase];

/**
 * 性能配置映射
 */
const PERFORMANCE_MODE_CONFIGS: Record<string, Partial<PerformanceConfig>> = {
  high: {
    targetFPS: 60,
    memoryThresholdMB: 150,
    enableRaf: true,
    enableGpu: true,
    enableMemoization: true,
    enableProfiling: true
  },
  normal: {
    targetFPS: 45,
    memoryThresholdMB: 100,
    enableRaf: true,
    enableGpu: true,
    enableMemoization: true,
    enableProfiling: false
  },
  low: {
    targetFPS: 30,
    memoryThresholdMB: 80,
    enableRaf: false,
    enableGpu: false,
    enableMemoization: true,
    enableProfiling: false
  },
  auto: DEFAULT_PERFORMANCE_CONFIG
};

/**
 * 动画变体配置
 */
const getAnimationVariants = (performanceMode: string, enableGpu: boolean) => {
  const baseTransition = performanceMode === 'low' ? 
    { duration: 0.5, ease: 'linear' } : 
    { duration: 0.3, type: 'spring', stiffness: 150, damping: 20 };

  return {
    container: {
      idle: {
        scale: 1,
        filter: 'brightness(1)',
        ...(enableGpu ? { transform: 'translateZ(0)' } : {}),
        transition: baseTransition
      },
      prepare: {
        scale: 0.98,
        filter: 'brightness(1.05)',
        transition: { ...baseTransition, duration: 0.2 }
      },
      spinning: {
        scale: 0.95,
        filter: 'brightness(1.1)',
        transition: baseTransition
      },
      result: {
        scale: 1.02,
        filter: 'brightness(1.15)',
        transition: {
          duration: 0.5,
          type: performanceMode === 'low' ? 'tween' : 'spring',
          stiffness: 200,
          damping: 15
        }
      }
    },
    prize: {
      idle: {
        scale: 1,
        rotateX: 0,
        opacity: 1,
        transition: baseTransition
      },
      spinning: (index: number) => ({
        scale: 0.9 + Math.random() * 0.2,
        rotateX: performanceMode === 'low' ? 0 : Math.random() * 360,
        opacity: 0.7 + Math.random() * 0.3,
        transition: {
          duration: 0.1,
          delay: index * 0.05,
          repeat: Infinity,
          repeatType: 'reverse' as const
        }
      }),
      result: (isWinner: boolean) => ({
        scale: isWinner ? 1.2 : 1,
        rotateX: 0,
        opacity: 1,
        boxShadow: isWinner ? '0 0 20px rgba(59, 130, 246, 0.5)' : '0 0 0 rgba(0,0,0,0)',
        transition: {
          duration: 0.6,
          type: performanceMode === 'low' ? 'tween' : 'spring',
          stiffness: 100,
          damping: 10
        }
      })
    }
  };
};

/**
 * 优化版老虎机组件实现
 */
export const OptimizedSlotMachine = forwardRef<OptimizedSlotMachineRef, OptimizedSlotMachineProps>(({
  prizes,
  enabled = true,
  onAnimationComplete,
  onAnimationStart,
  onPerformanceChange,
  className,
  columns = 3,
  performanceMode = 'normal',
  performanceConfig,
  autoTune = true
}, ref) => {
  // 错误报告
  const { reportError, reportPerformance } = useErrorReporting();
  
  // 检测用户偏好
  const prefersReducedMotion = useReducedMotion();
  
  // 性能配置状态
  const [currentConfig, setCurrentConfig] = useOptimizedState<PerformanceConfig>(() => ({
    ...DEFAULT_PERFORMANCE_CONFIG,
    ...PERFORMANCE_MODE_CONFIGS[performanceMode],
    ...performanceConfig
  }));
  
  // 动画状态
  const [animationPhase, setAnimationPhase] = useOptimizedState<OptimizedAnimationPhase>(
    OptimizedAnimationPhase.Idle
  );
  
  const [targetPrizeId, setTargetPrizeId] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 性能监控
  const { metrics, startProfiling, stopProfiling } = usePerformanceMonitoring(currentConfig);
  const { isSupported: gpuSupported, enableGPU, disableGPU } = useGPUAcceleration();
  
  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  
  // 动画变体
  const animationVariants = useMemo(() => 
    getAnimationVariants(performanceMode, currentConfig.enableGpu && gpuSupported),
    [performanceMode, currentConfig.enableGpu, gpuSupported]
  );
  
  // 奖品网格排列
  const prizeGrid = useMemo(() => {
    const grid = [];
    const totalSlots = columns * Math.ceil(prizes.length / columns);
    
    for (let i = 0; i < totalSlots; i++) {
      const prize = prizes[i % prizes.length];
      grid.push({ ...prize, gridIndex: i });
    }
    
    return grid;
  }, [prizes, columns]);
  
  // 性能监控效果
  useEffect(() => {
    if (currentConfig.enableProfiling) {
      startProfiling();
    } else {
      stopProfiling();
    }
    
    return stopProfiling;
  }, [currentConfig.enableProfiling, startProfiling, stopProfiling]);
  
  // 性能指标回调
  useEffect(() => {
    onPerformanceChange?.(metrics);
    
    // 自动调优
    if (autoTune && performanceMode === 'auto') {
      autoTunePerformance(metrics, (newConfig) => {
        setCurrentConfig(prev => ({ ...prev, ...newConfig }));
      });
    }
  }, [metrics, onPerformanceChange, autoTune, performanceMode]);
  
  // GPU 加速控制
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (currentConfig.enableGpu && gpuSupported) {
      enableGPU(containerRef.current);
    } else {
      disableGPU(containerRef.current);
    }
  }, [currentConfig.enableGpu, gpuSupported, enableGPU, disableGPU]);
  
  // 动画帧优化
  const { start: startAnimationFrame, stop: stopAnimationFrame } = useOptimizedAnimationFrame(
    (time) => {
      if (animationPhase === OptimizedAnimationPhase.Spinning) {
        // 记录动画帧时间
        reportPerformance({ animationFrameTime: time });
      }
    },
    [animationPhase],
    currentConfig
  );
  
  // 开始动画
  const startAnimation = useCallback(async (prizeId: string): Promise<void> => {
    if (!enabled || isAnimating || prefersReducedMotion) {
      return;
    }
    
    try {
      setIsAnimating(true);
      setTargetPrizeId(prizeId);
      
      // 触发开始回调
      onAnimationStart?.();
      
      // 开始性能监控
      if (currentConfig.enableProfiling) {
        startAnimationFrame();
      }
      
      // 动画序列
      setAnimationPhase(OptimizedAnimationPhase.Prepare);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setAnimationPhase(OptimizedAnimationPhase.Spinning);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAnimationPhase(OptimizedAnimationPhase.Stopping);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setAnimationPhase(OptimizedAnimationPhase.Result);
      
      // 触发完成回调
      onAnimationComplete?.(prizeId);
      
      // 返回空闲状态
      animationTimeoutRef.current = setTimeout(() => {
        setAnimationPhase(OptimizedAnimationPhase.Idle);
        setIsAnimating(false);
        stopAnimationFrame();
      }, 2000);
      
    } catch (error) {
      reportError(error as Error, { 
        prizeId, 
        animationPhase,
        performanceMode 
      });
      
      setAnimationPhase(OptimizedAnimationPhase.Error);
      setIsAnimating(false);
      stopAnimationFrame();
      
      setTimeout(() => {
        setAnimationPhase(OptimizedAnimationPhase.Idle);
      }, 1000);
    }
  }, [
    enabled, 
    isAnimating, 
    prefersReducedMotion, 
    onAnimationStart, 
    onAnimationComplete,
    currentConfig.enableProfiling,
    startAnimationFrame,
    stopAnimationFrame,
    reportError,
    animationPhase,
    performanceMode
  ]);
  
  // 停止动画
  const stopAnimation = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    setAnimationPhase(OptimizedAnimationPhase.Idle);
    setIsAnimating(false);
    stopAnimationFrame();
  }, [stopAnimationFrame]);
  
  // 获取当前指标
  const getCurrentMetrics = useCallback(() => metrics, [metrics]);
  
  // 更新性能配置
  const updatePerformanceConfig = useCallback((newConfig: Partial<PerformanceConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...newConfig }));
  }, [setCurrentConfig]);
  
  // 暴露引用方法
  useImperativeHandle(ref, () => ({
    startAnimation,
    stopAnimation,
    getCurrentMetrics,
    updatePerformanceConfig
  }), [startAnimation, stopAnimation, getCurrentMetrics, updatePerformanceConfig]);
  
  // 清理效果
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      stopAnimationFrame();
    };
  }, [stopAnimationFrame]);
  
  if (!enabled || prefersReducedMotion) {
    return (
      <div className={cn('flex flex-wrap justify-center gap-4 p-6', className)}>
        {prizes.slice(0, columns).map((prize) => (
          <PrizeDisplay
            key={prize.id}
            prize={prize}
            state={targetPrizeId === prize.id ? PrizeDisplayState.Winner : PrizeDisplayState.Normal}
            className="w-20 h-20"
          />
        ))}
      </div>
    );
  }
  
  return (
    <AnimationErrorBoundary>
      <motion.div
        ref={containerRef}
        className={cn(
          'relative p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700',
          className
        )}
        variants={animationVariants.container}
        animate={animationPhase}
        data-testid="optimized-slot-machine"
      >
        {/* 性能指标显示（开发模式） */}
        {process.env.NODE_ENV === 'development' && currentConfig.enableProfiling && (
          <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
            FPS: {metrics.fps} | Memory: {metrics.memoryUsage.toFixed(1)}MB
          </div>
        )}
        
        {/* 奖品网格 */}
        <div 
          className={cn(
            'grid gap-4 justify-center',
            `grid-cols-${columns}`
          )}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          <AnimatePresence mode="wait">
            {prizeGrid.map((prize, index) => (
              <motion.div
                key={`${prize.id}-${prize.gridIndex}`}
                variants={animationVariants.prize}
                animate={
                  animationPhase === OptimizedAnimationPhase.Spinning
                    ? 'spinning'
                    : animationPhase === OptimizedAnimationPhase.Result
                    ? 'result'
                    : 'idle'
                }
                custom={
                  animationPhase === OptimizedAnimationPhase.Spinning
                    ? index
                    : targetPrizeId === prize.id
                }
                className="flex justify-center"
                data-animation="slot-prize"
              >
                <PrizeDisplay
                  prize={prize}
                  state={
                    animationPhase === OptimizedAnimationPhase.Result && targetPrizeId === prize.id
                      ? PrizeDisplayState.Winner
                      : animationPhase === OptimizedAnimationPhase.Spinning
                      ? PrizeDisplayState.Spinning
                      : PrizeDisplayState.Normal
                  }
                  className="w-16 h-16 sm:w-20 sm:h-20"
                  performanceMode={performanceMode}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* 状态指示器 */}
        <div className="mt-4 text-center">
          {animationPhase === OptimizedAnimationPhase.Prepare && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-blue-600 dark:text-blue-400"
            >
              🎰 准备中...
            </motion.div>
          )}
          
          {animationPhase === OptimizedAnimationPhase.Spinning && (
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-purple-600 dark:text-purple-400"
            >
              🎲 抽奖中...
            </motion.div>
          )}
          
          {animationPhase === OptimizedAnimationPhase.Result && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-green-600 dark:text-green-400 text-lg font-bold"
            >
              🎉 恭喜中奖！
            </motion.div>
          )}
          
          {animationPhase === OptimizedAnimationPhase.Error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-600 dark:text-red-400"
            >
              ⚠️ 动画出错，请重试
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimationErrorBoundary>
  );
});

OptimizedSlotMachine.displayName = 'OptimizedSlotMachine';

export default OptimizedSlotMachine;