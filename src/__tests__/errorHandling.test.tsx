/**
 * 错误处理系统测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary, AnimationErrorBoundary, DataErrorBoundary } from '../components/error/ErrorBoundary';
import { errorReporting, setupGlobalErrorHandling } from '../lib/errorReporting';

// 模拟组件
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal component</div>;
};

const AsyncThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      setTimeout(() => {
        throw new Error('Async test error');
      }, 100);
    }
  }, [shouldThrow]);
  
  return <div>Async component</div>;
};

describe('ErrorBoundary', () => {
  const originalError = console.error;
  
  beforeEach(() => {
    // 静默错误输出
    console.error = vi.fn();
    
    // 清理错误报告
    localStorage.removeItem('lottery-errors');
  });
  
  afterEach(() => {
    console.error = originalError;
  });
  
  it('应该捕获组件错误并显示错误UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('出现了意外错误')).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
    expect(screen.getByText('重新开始')).toBeInTheDocument();
  });
  
  it('应该正常渲染没有错误的组件', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal component')).toBeInTheDocument();
  });
  
  it('应该调用自定义错误处理器', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(\n      expect.any(Error),\n      expect.objectContaining({\n        componentStack: expect.any(String)\n      })\n    );\n  });\n  \n  it('应该在错误时存储错误报告', () => {\n    render(\n      <ErrorBoundary>\n        <ThrowError shouldThrow={true} />\n      </ErrorBoundary>\n    );\n    \n    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');\n    expect(storedErrors).toHaveLength(1);\n    expect(storedErrors[0]).toMatchObject({\n      message: 'Test error',\n      timestamp: expect.any(String),\n      userAgent: expect.any(String)\n    });\n  });\n  \n  it('重试按钮应该重置错误状态', () => {\n    const { rerender } = render(\n      <ErrorBoundary>\n        <ThrowError shouldThrow={true} />\n      </ErrorBoundary>\n    );\n    \n    expect(screen.getByText('出现了意外错误')).toBeInTheDocument();\n    \n    fireEvent.click(screen.getByText('重试'));\n    \n    rerender(\n      <ErrorBoundary>\n        <ThrowError shouldThrow={false} />\n      </ErrorBoundary>\n    );\n    \n    expect(screen.getByText('Normal component')).toBeInTheDocument();\n  });\n  \n  it('重新开始按钮应该清除本地存储', () => {\n    // 设置一些测试数据\n    localStorage.setItem('lottery-state', 'test-state');\n    localStorage.setItem('lottery-history', 'test-history');\n    \n    const mockReload = vi.fn();\n    Object.defineProperty(window, 'location', {\n      value: { reload: mockReload },\n      writable: true\n    });\n    \n    render(\n      <ErrorBoundary>\n        <ThrowError shouldThrow={true} />\n      </ErrorBoundary>\n    );\n    \n    fireEvent.click(screen.getByText('重新开始'));\n    \n    expect(localStorage.getItem('lottery-state')).toBeNull();\n    expect(localStorage.getItem('lottery-history')).toBeNull();\n    expect(mockReload).toHaveBeenCalled();\n  });\n});\n\ndescribe('AnimationErrorBoundary', () => {\n  beforeEach(() => {\n    console.error = vi.fn();\n  });\n  \n  afterEach(() => {\n    console.error = originalError;\n  });\n  \n  it('应该显示动画特定的错误消息', () => {\n    render(\n      <AnimationErrorBoundary>\n        <ThrowError shouldThrow={true} />\n      </AnimationErrorBoundary>\n    );\n    \n    expect(screen.getByText('动画渲染出错，请刷新页面重试')).toBeInTheDocument();\n  });\n  \n  it('应该清理动画元素', () => {\n    // 创建一个带有动画属性的测试元素\n    const animationElement = document.createElement('div');\n    animationElement.setAttribute('data-animation', 'true');\n    animationElement.style.animation = 'test-animation';\n    animationElement.style.transition = 'all 0.3s';\n    document.body.appendChild(animationElement);\n    \n    render(\n      <AnimationErrorBoundary>\n        <ThrowError shouldThrow={true} />\n      </AnimationErrorBoundary>\n    );\n    \n    // 验证动画被清理\n    expect(animationElement.style.animation).toBe('none');\n    expect(animationElement.style.transition).toBe('none');\n    \n    // 清理\n    document.body.removeChild(animationElement);\n  });\n});\n\ndescribe('DataErrorBoundary', () => {\n  beforeEach(() => {\n    console.error = vi.fn();\n    vi.useFakeTimers();\n  });\n  \n  afterEach(() => {\n    console.error = originalError;\n    vi.useRealTimers();\n  });\n  \n  it('应该显示数据特定的错误消息', () => {\n    render(\n      <DataErrorBoundary>\n        <ThrowError shouldThrow={true} />\n      </DataErrorBoundary>\n    );\n    \n    expect(screen.getByText('数据加载出错，正在重试...')).toBeInTheDocument();\n  });\n  \n  it('应该在3秒后自动重新加载页面', () => {\n    const mockReload = vi.fn();\n    Object.defineProperty(window, 'location', {\n      value: { reload: mockReload },\n      writable: true\n    });\n    \n    render(\n      <DataErrorBoundary>\n        <ThrowError shouldThrow={true} />\n      </DataErrorBoundary>\n    );\n    \n    // 快进3秒\n    vi.advanceTimersByTime(3000);\n    \n    expect(mockReload).toHaveBeenCalled();\n  });\n});\n\ndescribe('全局错误处理', () => {\n  beforeEach(() => {\n    console.error = vi.fn();\n    localStorage.removeItem('lottery-errors');\n    setupGlobalErrorHandling(errorReporting);\n  });\n  \n  afterEach(() => {\n    console.error = originalError;\n  });\n  \n  it('应该捕获未处理的JavaScript错误', () => {\n    const error = new Error('Unhandled error');\n    \n    // 触发全局错误事件\n    window.dispatchEvent(new ErrorEvent('error', {\n      error,\n      message: error.message,\n      filename: 'test.js',\n      lineno: 1,\n      colno: 1\n    }));\n    \n    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');\n    expect(storedErrors).toHaveLength(1);\n    expect(storedErrors[0].message).toBe('Unhandled error');\n  });\n  \n  it('应该捕获未处理的Promise拒绝', () => {\n    const reason = 'Promise rejection reason';\n    \n    // 触发未处理的Promise拒绝事件\n    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {\n      promise: Promise.reject(reason),\n      reason\n    }));\n    \n    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');\n    expect(storedErrors).toHaveLength(1);\n    expect(storedErrors[0].message).toBe('Promise rejection reason');\n  });\n  \n  it('应该捕获资源加载错误', () => {\n    const img = document.createElement('img');\n    img.src = 'invalid-image.jpg';\n    document.body.appendChild(img);\n    \n    // 触发资源加载错误\n    img.dispatchEvent(new ErrorEvent('error'));\n    \n    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');\n    expect(storedErrors).toHaveLength(1);\n    expect(storedErrors[0].message).toContain('Resource failed to load');\n    \n    // 清理\n    document.body.removeChild(img);\n  });\n});\n\ndescribe('错误报告服务', () => {\n  beforeEach(() => {\n    localStorage.removeItem('lottery-errors');\n  });\n  \n  it('应该正确报告错误', () => {\n    const error = new Error('Test error');\n    const context = { component: 'TestComponent' };\n    \n    const errorId = errorReporting.reportError(error, context, 'medium');\n    \n    expect(errorId).toMatch(/^error_\\d+_\\w+$/);\n    \n    const storedErrors = errorReporting.getErrorReports();\n    expect(storedErrors).toHaveLength(1);\n    expect(storedErrors[0]).toMatchObject({\n      id: errorId,\n      message: 'Test error',\n      severity: 'medium',\n      context\n    });\n  });\n  \n  it('应该限制存储的错误数量', () => {\n    // 生成超过限制的错误\n    for (let i = 0; i < 60; i++) {\n      errorReporting.reportError(new Error(`Error ${i}`));\n    }\n    \n    const storedErrors = errorReporting.getErrorReports();\n    expect(storedErrors.length).toBeLessThanOrEqual(50); // MAX_ERRORS = 50\n  });\n  \n  it('应该正确清理旧错误', () => {\n    // 添加一些错误\n    errorReporting.reportError(new Error('Error 1'));\n    errorReporting.reportError(new Error('Error 2'));\n    \n    expect(errorReporting.getErrorReports()).toHaveLength(2);\n    \n    // 执行清理\n    errorReporting.cleanup();\n    \n    // 由于错误是刚创建的，不应该被清理\n    expect(errorReporting.getErrorReports()).toHaveLength(2);\n  });\n  \n  it('应该正确导出数据', () => {\n    errorReporting.reportError(new Error('Test error'));\n    errorReporting.recordPerformanceMetric({ fps: 60 });\n    \n    const exportedData = errorReporting.exportData();\n    \n    expect(exportedData.errors).toHaveLength(1);\n    expect(exportedData.performance).toHaveLength(1);\n    expect(exportedData.errors[0].message).toBe('Test error');\n    expect(exportedData.performance[0].fps).toBe(60);\n  });\n});"