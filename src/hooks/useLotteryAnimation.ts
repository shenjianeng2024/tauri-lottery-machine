/**
 * 抽奖动画状态管理钩子
 * 管理老虎机动画的各个阶段和状态转换
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Prize } from '@/types/lottery';

/**
 * 动画阶段枚举
 */
export const AnimationPhase = {
  Idle: 'idle',        // 空闲状态
  Prepare: 'prepare',  // 准备阶段 (0.2s)
  Spinning: 'spinning', // 滚动阶段 (2-3s)
  Slowing: 'slowing',  // 减速阶段 (1s)
  Result: 'result'     // 结果阶段 (0.5s)
} as const;

export type AnimationPhase = typeof AnimationPhase[keyof typeof AnimationPhase];

/**
 * 单个奖品的动画状态
 */
export interface PrizeAnimationState {
  isHighlighted: boolean;
  scale: number;
  rotation: number;
  opacity: number;
  glowIntensity: number;
}

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  /** 准备阶段持续时间 (ms) */
  prepareDuration: number;
  /** 滚动阶段持续时间范围 (ms) */
  spinDuration: [number, number];
  /** 减速阶段持续时间 (ms) */
  slowingDuration: number;
  /** 结果显示持续时间 (ms) */
  resultDuration: number;
  /** 动画帧率 (fps) */
  targetFPS: number;
  /** 性能降级阈值 */
  performanceThreshold: number;
}

/**
 * 默认动画配置
 */
const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  prepareDuration: 200,
  spinDuration: [2000, 3000],
  slowingDuration: 1000,
  resultDuration: 500,
  targetFPS: 60,
  performanceThreshold: 30
};

/**
 * 抽奖动画钩子
 */
export function useLotteryAnimation(
  prizes: Prize[],
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
) {
  // 当前动画阶段
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>(AnimationPhase.Idle);
  
  // 每个奖品的动画状态
  const [prizeStates, setPrizeStates] = useState<Record<string, PrizeAnimationState>>({});
  
  // 当前选中的奖品ID
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  
  // 动画是否正在进行中
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 性能监控
  const [currentFPS, setCurrentFPS] = useState(60);
  
  // 引用
  const animationFrameRef = useRef<number>();
  const phaseTimeoutRef = useRef<NodeJS.Timeout>();
  const frameCountRef = useRef<number>(0);
  const fpsUpdateTimeRef = useRef<number>(0);

  /**
   * 初始化所有奖品的动画状态
   */
  const initializePrizeStates = useCallback(() => {
    const initialStates: Record<string, PrizeAnimationState> = {};
    prizes.forEach(prize => {
      initialStates[prize.id] = {
        isHighlighted: false,
        scale: 1,
        rotation: 0,
        opacity: 1,
        glowIntensity: 0
      };
    });
    setPrizeStates(initialStates);
  }, [prizes]);

  /**
   * 性能监控
   */
  const updateFPS = useCallback((currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime >= fpsUpdateTimeRef.current + 1000) {
      const fps = Math.round(
        (frameCountRef.current * 1000) / (currentTime - fpsUpdateTimeRef.current)
      );
      setCurrentFPS(fps);
      frameCountRef.current = 0;
      fpsUpdateTimeRef.current = currentTime;
    }
  }, []);

  /**
   * 准备阶段动画 - 所有奖品轻微晃动
   */
  const animatePreparePhase = useCallback(() => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / config.prepareDuration, 1);
      
      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach(prize => {
          const wobble = Math.sin(elapsed * 0.01) * 2;
          newStates[prize.id] = {
            ...prev[prize.id],
            scale: 1 + Math.sin(progress * Math.PI) * 0.05,
            rotation: wobble,
            glowIntensity: progress * 0.3
          };
        });
        return newStates;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPhase(AnimationPhase.Spinning);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.prepareDuration]);

  /**
   * 滚动阶段动画 - 快速随机高亮效果
   */
  const animateSpinningPhase = useCallback((_targetPrizeId: string) => {
    const duration = config.spinDuration[0] + 
      Math.random() * (config.spinDuration[1] - config.spinDuration[0]);
    const startTime = Date.now();
    let currentHighlightIndex = 0;
    let lastSwitchTime = startTime;
    const switchInterval = 100; // 100ms切换一次

    const animate = (currentTime: number) => {
      updateFPS(currentTime);
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 动态调整切换速度，越接近结束越慢
      const adjustedInterval = switchInterval * (1 + progress * 2);
      
      if (currentTime - lastSwitchTime >= adjustedInterval) {
        currentHighlightIndex = Math.floor(Math.random() * prizes.length);
        lastSwitchTime = currentTime;
      }

      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach((prize, index) => {
          const isHighlighted = index === currentHighlightIndex;
          const intensity = Math.sin(elapsed * 0.01) * 0.5 + 0.5;
          
          newStates[prize.id] = {
            ...prev[prize.id],
            isHighlighted,
            scale: isHighlighted ? 1.1 + intensity * 0.1 : 1,
            rotation: isHighlighted ? Math.sin(elapsed * 0.02) * 10 : 0,
            glowIntensity: isHighlighted ? intensity : 0.1
          };
        });
        return newStates;
      });

      if (progress < 1 && currentFPS >= config.performanceThreshold) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (progress < 1 && currentFPS < config.performanceThreshold) {
        // 性能降级：减少更新频率
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(animate);
        }, 33); // 30fps
      } else {
        setCurrentPhase(AnimationPhase.Slowing);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.spinDuration, config.performanceThreshold, currentFPS, updateFPS]);

  /**
   * 减速阶段动画 - 逐渐聚焦到目标奖品
   */
  const animateSlowingPhase = useCallback((targetPrizeId: string) => {
    const startTime = Date.now();
    const targetIndex = prizes.findIndex(p => p.id === targetPrizeId);
    
    const animate = (currentTime: number) => {
      updateFPS(currentTime);
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / config.slowingDuration, 1);
      
      // 缓动函数：开始快，后面慢
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach((prize, index) => {
          const isTarget = prize.id === targetPrizeId;
          const distanceFromTarget = Math.abs(index - targetIndex);
          
          // 根据距离目标的远近决定高亮概率
          const highlightProbability = isTarget 
            ? 0.7 + easeOut * 0.3 
            : Math.max(0, 0.3 - distanceFromTarget * 0.1) * (1 - easeOut);
          
          const isHighlighted = Math.random() < highlightProbability;
          
          newStates[prize.id] = {
            ...prev[prize.id],
            isHighlighted,
            scale: isHighlighted ? 1.08 : 1,
            rotation: isHighlighted ? Math.sin(elapsed * 0.015) * 5 : 0,
            glowIntensity: isHighlighted ? 0.6 + easeOut * 0.4 : 0.05,
            opacity: isTarget ? 1 : 1 - easeOut * 0.3
          };
        });
        return newStates;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPhase(AnimationPhase.Result);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.slowingDuration, updateFPS]);

  /**
   * 结果阶段动画 - 中奖奖品高亮显示
   */
  const animateResultPhase = useCallback((targetPrizeId: string) => {
    const startTime = Date.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / config.resultDuration, 1);
      
      // 弹性动画效果
      const bounce = Math.sin(progress * Math.PI * 6) * Math.exp(-progress * 3) * 0.1;
      
      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach(prize => {
          const isWinner = prize.id === targetPrizeId;
          newStates[prize.id] = {
            ...prev[prize.id],
            isHighlighted: isWinner,
            scale: isWinner ? 1.2 + bounce : 0.95,
            rotation: isWinner ? Math.sin(elapsed * 0.005) * 3 : 0,
            glowIntensity: isWinner ? 1 : 0,
            opacity: isWinner ? 1 : 0.4
          };
        });
        return newStates;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPhase(AnimationPhase.Idle);
        setIsAnimating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.resultDuration]);

  /**
   * 开始抽奖动画
   */
  const startAnimation = useCallback(async (targetPrizeId: string): Promise<void> => {
    return new Promise((resolve) => {
      if (isAnimating) return resolve();

      setIsAnimating(true);
      setSelectedPrizeId(targetPrizeId);
      initializePrizeStates();
      
      // 阶段序列执行
      setCurrentPhase(AnimationPhase.Prepare);
      
      // 监听阶段变化并执行相应动画
      const phaseChangeHandler = (phase: AnimationPhase) => {
        switch (phase) {
          case AnimationPhase.Prepare:
            animatePreparePhase();
            break;
          case AnimationPhase.Spinning:
            animateSpinningPhase(targetPrizeId);
            break;
          case AnimationPhase.Slowing:
            animateSlowingPhase(targetPrizeId);
            break;
          case AnimationPhase.Result:
            animateResultPhase(targetPrizeId);
            break;
          case AnimationPhase.Idle:
            resolve();
            break;
        }
      };

      // 立即开始准备阶段
      phaseChangeHandler(AnimationPhase.Prepare);
    });
  }, [
    isAnimating,
    initializePrizeStates,
    animatePreparePhase,
    animateSpinningPhase,
    animateSlowingPhase,
    animateResultPhase
  ]);

  /**
   * 停止动画
   */
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
    }
    
    setCurrentPhase(AnimationPhase.Idle);
    setIsAnimating(false);
    setSelectedPrizeId(null);
    initializePrizeStates();
  }, [initializePrizeStates]);

  /**
   * 重置动画状态
   */
  const resetAnimation = useCallback(() => {
    stopAnimation();
    initializePrizeStates();
  }, [stopAnimation, initializePrizeStates]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, []);

  // 初始化奖品状态
  useEffect(() => {
    if (prizes.length > 0 && Object.keys(prizeStates).length === 0) {
      initializePrizeStates();
    }
  }, [prizes, prizeStates, initializePrizeStates]);

  return {
    // 状态
    currentPhase,
    prizeStates,
    selectedPrizeId,
    isAnimating,
    currentFPS,
    
    // 方法
    startAnimation,
    stopAnimation,
    resetAnimation,
    
    // 配置
    config
  };
}

export default useLotteryAnimation;