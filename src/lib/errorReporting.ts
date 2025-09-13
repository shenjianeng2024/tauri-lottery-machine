import { ErrorInfo } from 'react';

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceMetrics {
  timestamp: string;
  fps?: number;
  memoryUsage?: number;
  renderTime?: number;
  animationFrameTime?: number;
  stateUpdateCount?: number;
}

class ErrorReportingService {
  private readonly MAX_ERRORS = 50;
  private readonly MAX_PERFORMANCE_ENTRIES = 100;
  private readonly STORAGE_KEY_ERRORS = 'lottery-errors';
  private readonly STORAGE_KEY_PERFORMANCE = 'lottery-performance';

  private performanceObserver?: PerformanceObserver;
  private frameCount = 0;
  private lastFrameTime = performance.now();

  constructor() {
    this.initializePerformanceMonitoring();
  }

  // 错误报告
  reportError(
    error: Error,
    context?: Record<string, any>,
    severity: ErrorReport['severity'] = 'medium',
    errorInfo?: ErrorInfo
  ): string {
    const id = this.generateErrorId();
    
    const report: ErrorReport = {
      id,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context,
      severity,
    };

    this.storeError(report);
    this.logError(report);
    
    // 严重错误的特殊处理
    if (severity === 'critical') {
      this.handleCriticalError(report);
    }

    return id;
  }

  // 异步错误报告
  reportAsyncError(
    message: string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): string {
    const syntheticError = error || new Error(message);
    
    return this.reportError(syntheticError, {
      source,
      lineno,
      colno,
      type: 'async'
    }, 'medium');
  }

  // Promise拒绝报告
  reportUnhandledRejection(event: PromiseRejectionEvent): string {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    return this.reportError(error, {
      type: 'unhandledRejection',
      reason: event.reason
    }, 'high');
  }

  // 性能指标记录
  recordPerformanceMetric(metrics: Partial<PerformanceMetrics>): void {
    const entry: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      ...metrics
    };

    this.storePerformanceMetric(entry);
  }

  // 获取错误报告
  getErrorReports(): ErrorReport[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_ERRORS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve error reports:', error);
      return [];
    }
  }

  // 获取性能指标
  getPerformanceMetrics(): PerformanceMetrics[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PERFORMANCE);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve performance metrics:', error);
      return [];
    }
  }

  // 清除旧数据
  cleanup(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7天前
    
    try {
      // 清理错误报告
      const errors = this.getErrorReports();
      const recentErrors = errors.filter(error => 
        new Date(error.timestamp).getTime() > cutoffTime
      );
      localStorage.setItem(this.STORAGE_KEY_ERRORS, JSON.stringify(recentErrors));

      // 清理性能指标
      const metrics = this.getPerformanceMetrics();
      const recentMetrics = metrics.filter(metric => 
        new Date(metric.timestamp).getTime() > cutoffTime
      );
      localStorage.setItem(this.STORAGE_KEY_PERFORMANCE, JSON.stringify(recentMetrics));
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // 导出数据用于分析
  exportData(): { errors: ErrorReport[]; performance: PerformanceMetrics[] } {
    return {
      errors: this.getErrorReports(),
      performance: this.getPerformanceMetrics()
    };
  }

  private initializePerformanceMonitoring(): void {
    // 监控渲染性能
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              this.recordPerformanceMetric({
                renderTime: entry.duration
              });
            }
          });
        });
        
        this.performanceObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not available:', error);
      }
    }

    // FPS 监控
    this.startFPSMonitoring();
    
    // 内存使用监控
    this.startMemoryMonitoring();
  }

  private startFPSMonitoring(): void {
    const measureFPS = (currentTime: number) => {
      this.frameCount++;
      
      if (currentTime - this.lastFrameTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
        
        this.recordPerformanceMetric({ fps });
        
        this.frameCount = 0;
        this.lastFrameTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        
        this.recordPerformanceMetric({
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        });
      }, 30000); // 每30秒记录一次
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeError(report: ErrorReport): void {
    try {
      const existing = this.getErrorReports();
      existing.push(report);
      
      // 保持数量限制
      if (existing.length > this.MAX_ERRORS) {
        existing.splice(0, existing.length - this.MAX_ERRORS);
      }
      
      localStorage.setItem(this.STORAGE_KEY_ERRORS, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to store error report:', error);
    }
  }

  private storePerformanceMetric(metric: PerformanceMetrics): void {
    try {
      const existing = this.getPerformanceMetrics();
      existing.push(metric);
      
      // 保持数量限制
      if (existing.length > this.MAX_PERFORMANCE_ENTRIES) {
        existing.splice(0, existing.length - this.MAX_PERFORMANCE_ENTRIES);
      }
      
      localStorage.setItem(this.STORAGE_KEY_PERFORMANCE, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to store performance metric:', error);
    }
  }

  private logError(report: ErrorReport): void {
    const logMethod = report.severity === 'critical' ? console.error : console.warn;
    
    logMethod('Error Report:', {
      id: report.id,
      message: report.message,
      severity: report.severity,
      timestamp: report.timestamp,
      context: report.context
    });
  }

  private handleCriticalError(report: ErrorReport): void {
    // 关键错误的处理逻辑
    console.error('CRITICAL ERROR DETECTED:', report);
    
    // 尝试保存关键状态
    try {
      const criticalState = {
        errorId: report.id,
        timestamp: report.timestamp,
        userState: localStorage.getItem('lottery-state')
      };
      
      localStorage.setItem('lottery-critical-error', JSON.stringify(criticalState));
    } catch (error) {
      console.error('Failed to save critical state:', error);
    }
    
    // 可以考虑显示特殊的错误UI或执行自动恢复
  }
}

// 全局错误处理器
export function setupGlobalErrorHandling(errorReporting: ErrorReportingService): void {
  // 捕获未处理的JavaScript错误
  window.addEventListener('error', (event) => {
    errorReporting.reportAsyncError(
      event.message,
      event.filename,
      event.lineno,
      event.colno,
      event.error
    );
  });

  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    errorReporting.reportUnhandledRejection(event);
  });

  // 捕获资源加载错误
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      const target = event.target as any;
      errorReporting.reportError(
        new Error(`Resource failed to load: ${target.src || target.href}`),
        {
          type: 'resource',
          tagName: target.tagName,
          src: target.src,
          href: target.href
        },
        'low'
      );
    }
  }, true);
}

// 单例实例
export const errorReporting = new ErrorReportingService();

// 性能标记工具
export const performance = {
  mark: (name: string) => {
    if ('performance' in window && 'mark' in window.performance) {
      window.performance.mark(name);
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if ('performance' in window && 'measure' in window.performance) {
      try {
        window.performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }
};

// React Hook for error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    return errorReporting.reportError(error, context);
  };

  const reportPerformance = (metrics: Partial<PerformanceMetrics>) => {
    errorReporting.recordPerformanceMetric(metrics);
  };

  return {
    reportError,
    reportPerformance,
    getErrorReports: () => errorReporting.getErrorReports(),
    getPerformanceMetrics: () => errorReporting.getPerformanceMetrics(),
    cleanup: () => errorReporting.cleanup()
  };
}