/**
 * 抽奖游戏主页面
 * 集成所有组件，提供完整的抽奖游戏体验
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { AnimatedLotteryMachine, AnimatedLotteryMachineState } from '@/components/animations';
import { LotteryMachine, LotteryMachineState } from '@/components/lottery/LotteryMachine';
import { SimpleSlotMachine } from '@/components/animations/SimpleSlotMachine';
import { HistoryModal } from '@/components/history/HistoryModal';
import { CycleProgress } from '@/components/progress/CycleProgress';
import { LotteryStats } from '@/components/stats/LotteryStats';
import type { 
  LotteryState, 
  LotteryResult, 
  LotteryCycle
} from '@/types/lottery';
import { 
  PrizeColor,
  createNewCycle,
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG
} from '@/types/lottery';
import { useLotteryStorage } from '@/lib/tauri-api';
import { TrophyIcon, HistoryIcon, BarChart3Icon } from 'lucide-react';
import '@/styles/animations.css';

/**
 * 游戏页面状态枚举
 */
export enum GamePageState {
  Loading = 'loading',
  Ready = 'ready',
  Playing = 'playing',
  Error = 'error'
}

/**
 * LotteryGame页面组件
 */
export function LotteryGame() {
  const { save, load, autoSave } = useLotteryStorage();
  
  // 页面状态
  const [pageState, setPageState] = useState<GamePageState>(GamePageState.Loading);
  const [lotteryState, setLotteryState] = useState<LotteryState | null>(null);
  const [, setMachineState] = useState<LotteryMachineState>(LotteryMachineState.Loading);
  
  // 显示状态
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [recentResult, setRecentResult] = useState<LotteryResult | null>(null);

  /**
   * 初始化加载数据
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        setPageState(GamePageState.Loading);
        
        // 尝试加载保存的数据
        const savedData = await load();
        
        if (savedData) {
          setLotteryState(savedData);
        } else {
          // 创建新的初始状态
          const initialState: LotteryState = {
            currentCycle: createNewCycle(),
            history: [],
            availablePrizes: createDefaultPrizes(),
            config: DEFAULT_LOTTERY_CONFIG
          };
          setLotteryState(initialState);
          // 保存初始状态
          await save(initialState);
        }
        
        setPageState(GamePageState.Ready);
      } catch (error) {
        console.error('初始化数据失败:', error);
        setPageState(GamePageState.Error);
      }
    };

    initializeData();
  }, [load, save]);

  /**
   * 处理抽奖完成事件
   */
  const handleDrawComplete = async (result: LotteryResult) => {
    setRecentResult(result);
    
    // 自动保存数据
    if (lotteryState) {
      await autoSave(lotteryState);
    }
  };

  /**
   * 处理周期完成事件
   */
  const handleCycleComplete = async (completedCycle: LotteryCycle) => {
    console.log('周期完成:', completedCycle);
    
    // 自动保存数据
    if (lotteryState) {
      await autoSave(lotteryState);
    }
  };

  /**
   * 处理状态变化
   */
  const handleStateChange = (newState: LotteryMachineState) => {
    setMachineState(newState);
    
    // 根据抽奖机状态更新页面状态
    if (newState === LotteryMachineState.Drawing) {
      setPageState(GamePageState.Playing);
    } else if (newState === LotteryMachineState.Ready) {
      setPageState(GamePageState.Ready);
    }
  };

  /**
   * 保存数据
   */
  const handleSave = async (newLotteryState: LotteryState): Promise<boolean> => {
    try {
      await save(newLotteryState);
      setLotteryState(newLotteryState);
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  };

  /**
   * 显示历史记录
   */
  const handleShowHistory = () => {
    setShowHistory(true);
  };

  /**
   * 获取周期统计信息
   */
  const getCycleStats = () => {
    if (!lotteryState) return null;
    
    const { currentCycle } = lotteryState;
    const colorStats = {
      [PrizeColor.Red]: 0,
      [PrizeColor.Yellow]: 0,
      [PrizeColor.Blue]: 0
    };
    
    // 统计当前周期各颜色的中奖次数
    currentCycle.results.forEach(result => {
      const prize = lotteryState.availablePrizes.find(p => p.id === result.prizeId);
      if (prize) {
        colorStats[prize.color]++;
      }
    });
    
    return {
      total: currentCycle.results.length,
      remaining: lotteryState.config.drawsPerCycle - currentCycle.results.length,
      colorStats,
      remainingDraws: currentCycle.remainingDraws
    };
  };

  const cycleStats = getCycleStats();

  // 加载状态
  if (pageState === GamePageState.Loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">正在加载抽奖游戏...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (pageState === GamePageState.Error || !lotteryState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <div className="space-y-4">
            <div className="text-red-500 text-4xl">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600">加载失败</h2>
            <p className="text-muted-foreground">
              无法加载抽奖游戏数据，请刷新页面重试
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              刷新页面
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* 页面头部 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrophyIcon className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">三色抽奖机</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 周期信息 */}
              {cycleStats && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">进度:</span>
                  <Badge variant="outline">
                    {cycleStats.total}/{lotteryState.config.drawsPerCycle}
                  </Badge>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowStats(true)}
                title="查看统计"
              >
                <BarChart3Icon className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShowHistory}
                title="查看历史"
              >
                <HistoryIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主游戏区域 */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 周期进度 */}
          <CycleProgress 
            lotteryState={lotteryState}
            compact={false}
          />

          {/* 最近抽奖结果 */}
          {recentResult && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-center gap-3">
                <span className="text-lg">🎉</span>
                <span className="text-lg font-medium">
                  恭喜！抽中了 {lotteryState.availablePrizes.find(p => p.id === recentResult.prizeId)?.name}
                </span>
                <span className="text-lg">🎉</span>
              </div>
            </Card>
          )}

          {/* 抽奖机主体 */}
          <div className="bg-background/50 backdrop-blur rounded-lg border p-6">
            {/* 新的动画效果奖品展示 */}
            <SimpleSlotMachine
              prizes={lotteryState.availablePrizes}
              onAnimationComplete={(prizeId) => {
                console.log('动画完成，中奖奖品:', prizeId);
              }}
              className="mb-8"
            />
            
            {/* 保留原有的抽奖机逻辑，但隐藏奖品网格 */}
            <div style={{ display: 'none' }}>
              <LotteryMachine
                initialState={lotteryState}
                onDrawComplete={handleDrawComplete}
                onCycleComplete={handleCycleComplete}
                onShowHistory={handleShowHistory}
                onStateChange={handleStateChange}
                onSave={handleSave}
                animationDuration={lotteryState.config.animationDuration}
              />
            </div>
            
            {/* 自定义控制按钮 */}
            <div className="flex justify-center">
              <button 
                onClick={async () => {
                  // 触发新动画
                  const availablePrizes = lotteryState.availablePrizes.filter(prize => 
                    lotteryState.currentCycle.remainingDraws[prize.color] > 0
                  );
                  if (availablePrizes.length > 0) {
                    const randomPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
                    // @ts-ignore - 临时使用全局引用
                    if (window.__slotMachineRef?.startAnimation) {
                      await window.__slotMachineRef.startAnimation(randomPrize.id);
                    }
                  }
                }}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                🎰 开始抽奖
              </button>
            </div>
          </div>

          {/* 游戏说明 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">游戏说明</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 每个周期包含 {lotteryState.config.drawsPerCycle} 次抽奖机会</li>
              <li>• 每种颜色（红、黄、蓝）各有 {lotteryState.config.drawsPerColor} 次中奖机会</li>
              <li>• 点击"开始抽奖"按钮进行抽奖</li>
              <li>• 完成一个周期后可以开始新的周期</li>
              <li>• 所有抽奖记录都会自动保存</li>
            </ul>
          </Card>
        </div>
      </main>

      {/* 历史记录弹窗 */}
      <HistoryModal
        open={showHistory}
        onOpenChange={setShowHistory}
        lotteryState={lotteryState}
      />
      
      {/* 统计信息弹窗 */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">抽奖统计</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowStats(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-auto">
              <LotteryStats 
                lotteryState={lotteryState}
                showCharts={true}
                compact={false}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default LotteryGame;