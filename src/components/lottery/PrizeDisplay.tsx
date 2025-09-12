/**
 * 单个奖品展示组件
 * 支持不同状态：默认、高亮、选中
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Prize } from '@/types/lottery';
import { PrizeColor } from '@/types/lottery';

/**
 * 奖品显示状态枚举
 */
export enum PrizeDisplayState {
  Default = 'default',    // 默认状态
  Highlighted = 'highlighted',  // 高亮状态（动画中）
  Selected = 'selected',  // 选中状态（中奖）
  Disabled = 'disabled'   // 禁用状态（此颜色已无剩余）
}

/**
 * PrizeDisplay组件属性接口
 */
export interface PrizeDisplayProps {
  /** 奖品数据 */
  prize: Prize;
  /** 当前显示状态 */
  state: PrizeDisplayState;
  /** 点击事件处理函数 */
  onClick?: () => void;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示奖品信息 */
  showDetails?: boolean;
}

/**
 * 根据奖品颜色返回对应的CSS主题类
 */
function getPrizeColorClasses(color: PrizeColor): string {
  switch (color) {
    case PrizeColor.Red:
      return 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100';
    case PrizeColor.Yellow:
      return 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100';
    case PrizeColor.Green:
      return 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100';
  }
}

/**
 * 根据状态返回对应的样式类
 */
function getStateClasses(state: PrizeDisplayState): string {
  switch (state) {
    case PrizeDisplayState.Default:
      return 'hover:shadow-md transition-all duration-200 cursor-pointer';
    case PrizeDisplayState.Highlighted:
      return 'shadow-lg scale-105 ring-2 ring-primary/20 animate-pulse transition-all duration-300';
    case PrizeDisplayState.Selected:
      return 'shadow-xl scale-110 ring-4 ring-primary/40 bg-primary/10 transition-all duration-500';
    case PrizeDisplayState.Disabled:
      return 'opacity-50 grayscale cursor-not-allowed';
    default:
      return '';
  }
}

/**
 * 根据颜色返回对应的颜色标识
 */
function getColorBadgeVariant(color: PrizeColor): "default" | "secondary" | "destructive" | "outline" {
  switch (color) {
    case PrizeColor.Red:
      return 'destructive';
    case PrizeColor.Yellow:
      return 'default';
    case PrizeColor.Green:
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * PrizeDisplay组件
 */
export function PrizeDisplay({
  prize,
  state,
  onClick,
  className,
  showDetails = true,
}: PrizeDisplayProps) {
  const colorClasses = getPrizeColorClasses(prize.color);
  const stateClasses = getStateClasses(state);
  
  const handleClick = () => {
    if (state !== PrizeDisplayState.Disabled && onClick) {
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        'relative min-h-32 p-4 border-2 select-none',
        colorClasses,
        stateClasses,
        className
      )}
      onClick={handleClick}
    >
      {/* 颜色标识Badge */}
      <div className="absolute top-2 right-2">
        <Badge 
          variant={getColorBadgeVariant(prize.color)}
          className="text-xs px-2 py-1"
        >
          {prize.color === PrizeColor.Red && '红'}
          {prize.color === PrizeColor.Yellow && '黄'}  
          {prize.color === PrizeColor.Green && '绿'}
        </Badge>
      </div>

      {/* 奖品图标区域 */}
      <div className="flex items-center justify-center h-16 mb-2">
        {prize.icon ? (
          <img 
            src={prize.icon} 
            alt={prize.name}
            className="w-12 h-12 object-contain"
          />
        ) : (
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold",
            prize.color === PrizeColor.Red && 'bg-red-500 text-white',
            prize.color === PrizeColor.Yellow && 'bg-yellow-500 text-white',
            prize.color === PrizeColor.Green && 'bg-green-500 text-white'
          )}>
            {prize.color === PrizeColor.Red && '🎁'}
            {prize.color === PrizeColor.Yellow && '🏆'}
            {prize.color === PrizeColor.Green && '💎'}
          </div>
        )}
      </div>

      {/* 奖品信息 */}
      {showDetails && (
        <div className="text-center space-y-1">
          <h3 className="font-medium text-sm leading-tight">
            {prize.name}
          </h3>
          {prize.description && (
            <p className="text-xs opacity-75 leading-tight">
              {prize.description}
            </p>
          )}
        </div>
      )}

      {/* 状态指示器 */}
      {state === PrizeDisplayState.Selected && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm rounded-lg">
          <div className="text-2xl animate-bounce">🎉</div>
        </div>
      )}
      
      {state === PrizeDisplayState.Highlighted && (
        <div className="absolute inset-0 border-2 border-primary/30 rounded-lg animate-pulse" />
      )}
    </Card>
  );
}

/**
 * 奖品网格展示组件属性
 */
export interface PrizeGridProps {
  /** 奖品列表 */
  prizes: Prize[];
  /** 每个奖品的状态映射 */
  prizeStates: Record<string, PrizeDisplayState>;
  /** 奖品点击事件 */
  onPrizeClick?: (prize: Prize) => void;
  /** 网格列数 */
  columns?: number;
  /** 自定义样式 */
  className?: string;
}

/**
 * 奖品网格展示组件
 * 用于展示3x3的奖品网格
 */
export function PrizeGrid({
  prizes,
  prizeStates,
  onPrizeClick,
  columns = 3,
  className
}: PrizeGridProps) {
  return (
    <div 
      className={cn(
        'grid gap-4 w-full max-w-2xl mx-auto',
        columns === 3 && 'grid-cols-3',
        columns === 2 && 'grid-cols-2', 
        columns === 4 && 'grid-cols-4',
        className
      )}
    >
      {prizes.map((prize) => (
        <PrizeDisplay
          key={prize.id}
          prize={prize}
          state={prizeStates[prize.id] || PrizeDisplayState.Default}
          onClick={() => onPrizeClick?.(prize)}
        />
      ))}
    </div>
  );
}

export default PrizeDisplay;