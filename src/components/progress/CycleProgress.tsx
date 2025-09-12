/**
 * 周期进度组件
 * 
 * 显示当前周期的抽奖进度，包括总体进度和各颜色的剩余次数
 */

import { useMemo } from 'react';
import { Clock, Target, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LotteryState, CycleProgress as CycleProgressType } from '@/types/lottery';
import { PrizeColor } from '@/types/lottery';
import { cn } from '@/lib/utils';

/**
 * 周期进度组件属性接口
 */
export interface CycleProgressProps {
  /** 抽奖状态数据 */
  lotteryState: LotteryState;
  /** 显示详细信息 */
  showDetails?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 进度变化回调 */
  onProgressChange?: (progress: CycleProgressType) => void;
}

/**
 * 颜色配置
 */
const COLOR_CONFIG = {
  [PrizeColor.Red]: {
    name: '红色',
    bgClass: 'bg-red-100 dark:bg-red-900',
    textClass: 'text-red-800 dark:text-red-200',
    progressClass: 'bg-red-500',
    icon: '🔴'
  },
  [PrizeColor.Yellow]: {
    name: '黄色', 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900',
    textClass: 'text-yellow-800 dark:text-yellow-200',
    progressClass: 'bg-yellow-500',
    icon: '🟡'
  },
  [PrizeColor.Green]: {
    name: '绿色',
    bgClass: 'bg-green-100 dark:bg-green-900', 
    textClass: 'text-green-800 dark:text-green-200',
    progressClass: 'bg-green-500',
    icon: '🟢'
  }
};

/**
 * 周期进度组件
 */
export function CycleProgress({
  lotteryState,
  showDetails = true,
  compact = false,
  className,
  onProgressChange
}: CycleProgressProps) {
  /**
   * 计算进度数据
   */
  const progressData = useMemo((): CycleProgressType & {
    completedByColor: Record<PrizeColor, number>;
  } => {
    const { currentCycle, config } = lotteryState;
    const completedDraws = currentCycle.results.length;
    const totalDraws = config.drawsPerCycle;
    const percentage = totalDraws > 0 ? (completedDraws / totalDraws) * 100 : 0;

    // 计算各颜色已完成次数
    const completedByColor = {
      [PrizeColor.Red]: config.drawsPerColor - currentCycle.remainingDraws[PrizeColor.Red],
      [PrizeColor.Yellow]: config.drawsPerColor - currentCycle.remainingDraws[PrizeColor.Yellow],
      [PrizeColor.Green]: config.drawsPerColor - currentCycle.remainingDraws[PrizeColor.Green]
    };

    const progress: CycleProgressType & { completedByColor: Record<PrizeColor, number> } = {
      completedDraws,
      totalDraws,
      percentage,
      remainingByColor: { ...currentCycle.remainingDraws },
      completedByColor
    };

    // 触发回调
    onProgressChange?.(progress);

    return progress;
  }, [lotteryState, onProgressChange]);

  /**
   * 获取周期状态文字
   */
  const getStatusText = (): string => {
    if (lotteryState.currentCycle.completed) {
      return '周期已完成';
    }
    if (progressData.completedDraws === 0) {
      return '等待开始';
    }
    return '进行中';
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (): string => {
    if (lotteryState.currentCycle.completed) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (progressData.completedDraws === 0) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  /**
   * 渲染紧凑版本
   */
  if (compact) {
    return (
      <div className={cn("flex items-center space-x-4", className)}>
        {/* 总体进度 */}
        <div className="flex items-center space-x-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-[100px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>进度</span>
              <span>{progressData.completedDraws}/{progressData.totalDraws}</span>
            </div>
            <Progress 
              value={progressData.percentage} 
              className="h-2"
            />
          </div>
        </div>

        {/* 颜色统计 */}
        <div className="flex space-x-2">
          {(Object.keys(COLOR_CONFIG) as PrizeColor[]).map(color => {
            const config = COLOR_CONFIG[color];
            const completed = progressData.completedByColor[color];
            const remaining = progressData.remainingByColor[color];
            
            return (
              <Badge
                key={color}
                variant="secondary"
                className={cn("text-xs px-2", config.bgClass, config.textClass)}
              >
                {config.icon} {completed}/{completed + remaining}
              </Badge>
            );
          })}
        </div>
      </div>
    );
  }

  /**
   * 渲染完整版本
   */
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>当前周期进度</span>
          </div>
          <Badge 
            variant="secondary"
            className={cn("text-sm", getStatusColor())}
          >
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 总体进度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">总体进度</span>
            <span className="text-muted-foreground">
              {progressData.completedDraws} / {progressData.totalDraws} 次
            </span>
          </div>
          <Progress 
            value={progressData.percentage} 
            className="h-3"
          />
          <div className="text-xs text-muted-foreground text-center">
            {progressData.percentage.toFixed(1)}% 完成
          </div>
        </div>

        {showDetails && (
          <>
            {/* 分隔线 */}
            <div className="border-t" />

            {/* 各颜色详细进度 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium">
                <Award className="h-4 w-4" />
                <span>各颜色进度</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.keys(COLOR_CONFIG) as PrizeColor[]).map(color => {
                  const config = COLOR_CONFIG[color];
                  const completed = progressData.completedByColor[color];
                  const remaining = progressData.remainingByColor[color];
                  const total = completed + remaining;
                  const percentage = total > 0 ? (completed / total) * 100 : 0;

                  return (
                    <div
                      key={color}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all",
                        config.bgClass,
                        remaining === 0 
                          ? "border-green-300 dark:border-green-700" 
                          : "border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-lg">{config.icon}</span>
                          <span className={cn("text-sm font-medium", config.textClass)}>
                            {config.name}
                          </span>
                        </div>
                        <div className={cn("text-xs font-mono", config.textClass)}>
                          {completed}/{total}
                        </div>
                      </div>
                      
                      <Progress 
                        value={percentage} 
                        className="h-2 mb-2"
                      />
                      
                      <div className="flex justify-between text-xs">
                        <span className={config.textClass}>
                          已抽中 {completed} 次
                        </span>
                        <span className={config.textClass}>
                          {remaining > 0 ? `剩余 ${remaining} 次` : '已完成'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 周期信息 */}
        {showDetails && (
          <>
            <div className="border-t" />
            <div className="text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>周期ID: {lotteryState.currentCycle.id}</span>
                <span>
                  开始时间: {new Date(lotteryState.currentCycle.startTime).toLocaleString()}
                </span>
              </div>
              {lotteryState.currentCycle.completed && lotteryState.currentCycle.endTime && (
                <div className="text-center mt-1">
                  完成时间: {new Date(lotteryState.currentCycle.endTime).toLocaleString()}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}