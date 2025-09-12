/**
 * 简化版老虎机动画组件
 * 用于快速验证动画效果
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PrizeDisplay, PrizeDisplayState } from '@/components/lottery/PrizeDisplay';
import type { Prize } from '@/types/lottery';

interface SimpleSlotMachineProps {
  prizes: Prize[];
  onAnimationComplete?: (prizeId: string) => void;
  className?: string;
}

export const SimpleSlotMachine: React.FC<SimpleSlotMachineProps> = ({
  prizes,
  onAnimationComplete,
  className
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedPrizeId, setHighlightedPrizeId] = useState<string | null>(null);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);

  const startAnimation = useCallback(async (targetPrizeId: string) => {
    if (isAnimating) return;

    setIsAnimating(true);
    setSelectedPrizeId(null);
    
    // 阶段1: 快速随机高亮 (2秒)
    const animationDuration = 2000;
    const startTime = Date.now();
    
    const animateHighlight = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / animationDuration;
      
      if (progress < 0.8) {
        // 前80%时间随机高亮
        const randomIndex = Math.floor(Math.random() * prizes.length);
        setHighlightedPrizeId(prizes[randomIndex].id);
        
        const nextDelay = 50 + progress * 150; // 逐渐变慢
        setTimeout(animateHighlight, nextDelay);
      } else if (progress < 1) {
        // 最后20%时间锁定目标
        setHighlightedPrizeId(targetPrizeId);
        setTimeout(animateHighlight, 200);
      } else {
        // 动画结束
        setHighlightedPrizeId(null);
        setSelectedPrizeId(targetPrizeId);
        setIsAnimating(false);
        onAnimationComplete?.(targetPrizeId);
      }
    };

    animateHighlight();
  }, [isAnimating, prizes, onAnimationComplete]);

  // 通过全局引用暴露方法
  useEffect(() => {
    // @ts-ignore - 临时忽略类型检查
    window.__slotMachineRef = {
      startAnimation
    };
  }, [startAnimation]);

  // 映射奖品状态
  const getPrizeState = useCallback((prizeId: string): PrizeDisplayState => {
    if (prizeId === selectedPrizeId) {
      return PrizeDisplayState.Selected;
    } else if (prizeId === highlightedPrizeId) {
      return PrizeDisplayState.Highlighted;
    }
    return PrizeDisplayState.Default;
  }, [selectedPrizeId, highlightedPrizeId]);

  return (
    <motion.div
      className={cn('relative', className)}
      animate={{
        scale: isAnimating ? 0.98 : 1,
        filter: isAnimating ? 'brightness(1.1)' : 'brightness(1)'
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
        {prizes.map((prize) => (
          <motion.div
            key={prize.id}
            animate={{
              scale: getPrizeState(prize.id) === PrizeDisplayState.Highlighted ? 1.1 : 1,
              rotateZ: getPrizeState(prize.id) === PrizeDisplayState.Highlighted ? 
                Math.sin(Date.now() * 0.01) * 5 : 0
            }}
            transition={{ duration: 0.15 }}
            className={cn(
              'transform-gpu',
              getPrizeState(prize.id) === PrizeDisplayState.Highlighted && 'z-10'
            )}
          >
            <PrizeDisplay
              prize={prize}
              state={getPrizeState(prize.id)}
              onClick={() => {}} // 禁用点击
            />
          </motion.div>
        ))}
      </div>

      {/* 中奖特效 */}
      {selectedPrizeId && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.3, 0],
            scale: [0, 2, 3]
          }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)'
          }}
        />
      )}
    </motion.div>
  );
};

export default SimpleSlotMachine;