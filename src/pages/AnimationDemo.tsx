/**
 * 动画效果演示页面
 */

import React from 'react';
import { QuickSlotMachine } from '@/components/animations/QuickSlotMachine';
import { Card } from '@/components/ui/card';

export const AnimationDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold">🎰 老虎机动画效果演示</h1>
            <p className="text-muted-foreground mt-2">
              基于 Framer Motion 的流畅抽奖动画实现
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* 主演示区域 */}
          <QuickSlotMachine />

          {/* 技术说明 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">🎯 动画特性</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>分阶段动画：准备→滚动→减速→结果</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>60fps 流畅动画，支持降级到30fps</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>CSS硬件加速和性能优化</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>响应式设计和移动端适配</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>可配置的动画时长和效果</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">🔧 技术实现</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>Framer Motion</strong>: 复杂动画编排</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>CSS Transitions</strong>: 性能优化</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>requestAnimationFrame</strong>: 流畅循环</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>React Hooks</strong>: 状态管理</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>TypeScript</strong>: 类型安全</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* 使用说明 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📖 集成说明</h3>
            <div className="prose max-w-none text-sm">
              <p className="mb-4">
                这个动画组件可以轻松集成到现有的抽奖系统中：
              </p>
              
              <div className="bg-muted p-4 rounded-lg mb-4">
                <pre className="text-xs overflow-x-auto">
{`import { SlotMachine } from '@/components/animations';

<SlotMachine
  prizes={lotteryState.availablePrizes}
  enabled={true}
  performanceMode="normal"
  onAnimationStart={() => console.log('动画开始')}
  onAnimationComplete={(prizeId) => {
    console.log('中奖奖品:', prizeId);
  }}
/>`}
                </pre>
              </div>

              <p>
                组件支持多种配置选项，包括性能模式切换、动画时长调整、
                以及完整的回调事件系统，可以无缝集成到任何抽奖业务逻辑中。
              </p>
            </div>
          </Card>

          {/* 性能指标 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📊 性能指标</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">60fps</div>
                <div className="text-sm text-green-600 dark:text-green-400">目标帧率</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">&lt;100ms</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">响应时间</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">3s</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">动画时长</div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AnimationDemo;