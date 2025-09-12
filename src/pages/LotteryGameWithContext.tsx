/**
 * 基于Context状态管理的抽奖游戏页面
 * 使用新的全局状态管理系统，提供一致的用户体验
 */

import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimpleSlotMachine } from '@/components/animations/SimpleSlotMachine';
import { HistoryModal } from '@/components/history/HistoryModal';
import { CycleProgress } from '@/components/progress/CycleProgress';
import { LotteryStats } from '@/components/stats/LotteryStats';
import { 
  useLotteryState,
  useLotteryActions, 
  useLotterySelectors,
  useLotteryUI,
  useLotteryDraw,
  useCycleManagement,
  useLotteryData,
  useLotteryError
} from '@/hooks/useLotteryContext';
import { 
  createNewCycle,
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG
} from '@/types/lottery';
import { TrophyIcon, HistoryIcon, BarChart3Icon, RefreshCwIcon, AlertTriangleIcon } from 'lucide-react';

/**
 * 游戏主界面组件
 */
function GameMainContent() {
  const state = useLotteryState();
  const { canDraw, cycleStats } = useLotterySelectors();
  const { performLottery } = useLotteryDraw();
  const { initNewCycle } = useCycleManagement();

  // 处理抽奖
  const handleDraw = async () => {
    if (!canDraw) return;
    
    try {
      await performLottery();
    } catch (error) {
      console.error('抽奖失败:', error);
    }
  };

  // 处理新周期
  const handleNewCycle = async () => {
    try {
      await initNewCycle();
    } catch (error) {
      console.error('创建新周期失败:', error);
    }
  };

  if (!state.lotteryState) {
    return null;
  }

  const isCycleComplete = cycleStats?.isComplete;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 周期进度 */}
      <CycleProgress 
        lotteryState={state.lotteryState}
        compact={false}
      />

      {/* 最近抽奖结果 */}
      {state.recentResult && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-center gap-3">
            <span className="text-lg">🎉</span>
            <span className="text-lg font-medium">
              恭喜！抽中了 {state.recentResult.prizeName}
            </span>
            <span className="text-lg">🎉</span>
          </div>
        </Card>
      )}

      {/* 抽奖机主体 */}
      <div className="bg-background/50 backdrop-blur rounded-lg border p-6">
        {/* 动画效果奖品展示 */}
        <SimpleSlotMachine
          prizes={state.lotteryState.availablePrizes}
          onAnimationComplete={(prizeId) => {
            console.log('动画完成，中奖奖品:', prizeId);
          }}
          className="mb-8"
        />
        
        {/* 抽奖控制按钮 */}
        <div className="flex justify-center gap-4">
          {isCycleComplete ? (
            <Button 
              onClick={handleNewCycle}
              className="px-8 py-3 text-lg"
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <>
                  <RefreshCwIcon className="w-5 h-5 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  🔄 开始新周期
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleDraw}
              disabled={!canDraw || state.isAnimating}
              className="px-8 py-3 text-lg"
            >
              {state.isAnimating ? (
                <>
                  <RefreshCwIcon className="w-5 h-5 mr-2 animate-spin" />
                  抽奖中...
                </>
              ) : (
                '🎰 开始抽奖'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 游戏说明 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">游戏说明</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• 每个周期包含 {state.lotteryState.config.drawsPerCycle} 次抽奖机会</li>
          <li>• 每种颜色（红、黄、绿）各有 {state.lotteryState.config.drawsPerColor} 次中奖机会</li>
          <li>• 点击"开始抽奖"按钮进行抽奖</li>
          <li>• 完成一个周期后可以开始新的周期</li>
          <li>• 所有抽奖记录都会自动保存</li>
        </ul>
      </Card>
    </div>
  );
}

/**
 * 页面头部组件
 */
function GameHeader() {
  const { cycleStats } = useLotterySelectors();
  const { showHistory, showStats } = useLotteryActions();
  const state = useLotteryState();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophyIcon className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">三色抽奖机</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 周期信息 */}
            {cycleStats && state.lotteryState && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">进度:</span>
                <Badge variant="outline">
                  {cycleStats.completed}/{state.lotteryState.config.drawsPerCycle}
                </Badge>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={showStats}
              title="查看统计"
            >
              <BarChart3Icon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={showHistory}
              title="查看历史"
            >
              <HistoryIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * 加载状态组件
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-lg text-muted-foreground">正在加载抽奖游戏...</p>
      </div>
    </div>
  );
}

/**
 * 错误状态组件
 */
function ErrorScreen() {
  const { error, clearError } = useLotteryError();
  const { loadData } = useLotteryData();

  const handleRetry = async () => {
    clearError();
    try {
      await loadData();
    } catch (err) {
      console.error('重试失败:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 max-w-md text-center">
        <div className="space-y-4">
          <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-red-600">加载失败</h2>
          <p className="text-muted-foreground">
            {error || '无法加载抽奖游戏数据，请重试'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRetry} variant="outline">
              重试
            </Button>
            <Button onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * 模态框组件
 */
function GameModals() {
  const { showHistory: showHistoryModal, showStats: showStatsModal } = useLotteryUI();
  const { hideHistory, hideStats } = useLotteryActions();
  const state = useLotteryState();

  if (!state.lotteryState) return null;

  return (
    <>
      {/* 历史记录弹窗 */}
      <HistoryModal
        open={showHistoryModal}
        onOpenChange={(open) => open ? null : hideHistory()}
        lotteryState={state.lotteryState}
      />
      
      {/* 统计信息弹窗 */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">抽奖统计</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={hideStats}
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-auto">
              <LotteryStats 
                lotteryState={state.lotteryState}
                showCharts={true}
                compact={false}
              />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/**
 * 主游戏页面组件
 */
export function LotteryGameWithContext() {
  const state = useLotteryState();
  const { loadData } = useLotteryData();
  const { hasError } = useLotteryError();

  // 初始化数据加载
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 尝试加载保存的数据
        await loadData();
      } catch (error) {
        console.error('初始化数据失败:', error);
      }
    };

    // 只在第一次挂载时初始化
    if (!state.lotteryState && !state.isLoading && !hasError) {
      initializeData();
    }
  }, [loadData, state.lotteryState, state.isLoading, hasError]);

  // 错误状态
  if (hasError) {
    return <ErrorScreen />;
  }

  // 加载状态
  if (state.isLoading || !state.lotteryState) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <GameHeader />
      
      <main className="container mx-auto px-4 py-8">
        <GameMainContent />
      </main>

      <GameModals />
    </div>
  );
}

export default LotteryGameWithContext;