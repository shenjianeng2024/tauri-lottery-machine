import { useEffect } from 'react'
import { LotteryProvider, LotteryErrorBoundary } from './context/LotteryContext'
import { LotteryGameWithContext } from './pages/LotteryGameWithContext'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { FeedbackProvider, setupFeedbackErrorHandling } from './components/feedback/FeedbackSystem'
import { errorReporting, setupGlobalErrorHandling } from './lib/errorReporting'
import { performanceMonitor, memoryMonitor } from './lib/performanceOptimization'
import './App.css'

function App() {
  // 初始化全局错误处理和性能监控
  useEffect(() => {
    // 设置全局错误处理
    setupGlobalErrorHandling(errorReporting);
    setupFeedbackErrorHandling();
    
    // 启动性能监控
    performanceMonitor.start();
    memoryMonitor.start();
    
    // 定期清理旧数据
    const cleanupInterval = setInterval(() => {
      errorReporting.cleanup();
    }, 24 * 60 * 60 * 1000); // 每24小时清理一次
    
    return () => {
      performanceMonitor.stop();
      memoryMonitor.stop();
      clearInterval(cleanupInterval);
    };
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        errorReporting.reportError(error, {
          component: 'App',
          errorInfo: errorInfo.componentStack
        }, 'critical');
      }}
    >
      <FeedbackProvider>
        <LotteryErrorBoundary>
          <LotteryProvider>
            <LotteryGameWithContext />
          </LotteryProvider>
        </LotteryErrorBoundary>
      </FeedbackProvider>
    </ErrorBoundary>
  )
}

export default App
