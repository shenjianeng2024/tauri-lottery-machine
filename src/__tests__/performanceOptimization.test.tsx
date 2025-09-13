/**
 * 性能优化系统测试
 */

import React from 'react';
import { renderHook, render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  MemoryMonitor,
  FrameRateLimiter,
  useOptimizedAnimationFrame,
  useOptimizedState,
  usePerformanceMonitoring,
  useGPUAcceleration,
  autoTunePerformance,
  getPerformanceRecommendations
} from '../lib/performanceOptimization';

// 模拟 performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
  mark: vi.fn(),
  measure: vi.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// 模拟 requestAnimationFrame
const mockRaf = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(() => callback(1000), 16); // 模拟 60fps
  return 1;
});

const mockCancelRaf = vi.fn();

Object.defineProperty(global, 'requestAnimationFrame', {
  value: mockRaf,
  writable: true
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: mockCancelRaf,
  writable: true
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  
  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.useFakeTimers();
    mockRaf.mockClear();
  });
  
  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });
  
  it('应该正确启动和停止监控', () => {
    expect(monitor.getCurrentFPS()).toBe(0);
    
    monitor.start();\n    expect(mockRaf).toHaveBeenCalled();\n    \n    monitor.stop();\n    expect(mockCancelRaf).toHaveBeenCalled();\n  });\n  \n  it('应该正确计算FPS', async () => {\n    const callback = vi.fn();\n    monitor.onFPSUpdate(callback);\n    \n    monitor.start();\n    \n    // 模拟多个帧\n    act(() => {\n      vi.advanceTimersByTime(1000);\n    });\n    \n    expect(callback).toHaveBeenCalledWith(expect.any(Number));\n  });\n  \n  it('应该支持多个FPS更新监听器', () => {\n    const callback1 = vi.fn();\n    const callback2 = vi.fn();\n    \n    const unsubscribe1 = monitor.onFPSUpdate(callback1);\n    const unsubscribe2 = monitor.onFPSUpdate(callback2);\n    \n    monitor.start();\n    \n    act(() => {\n      vi.advanceTimersByTime(1000);\n    });\n    \n    expect(callback1).toHaveBeenCalled();\n    expect(callback2).toHaveBeenCalled();\n    \n    // 测试取消订阅\n    unsubscribe1();\n    \n    act(() => {\n      vi.advanceTimersByTime(1000);\n    });\n    \n    expect(callback2).toHaveBeenCalledTimes(2);\n    expect(callback1).toHaveBeenCalledTimes(1); // 不再被调用\n    \n    unsubscribe2();\n  });\n});\n\ndescribe('MemoryMonitor', () => {\n  let monitor: MemoryMonitor;\n  \n  beforeEach(() => {\n    monitor = new MemoryMonitor(80); // 80MB阈值\n    vi.useFakeTimers();\n  });\n  \n  afterEach(() => {\n    monitor.stop();\n    vi.useRealTimers();\n  });\n  \n  it('应该正确监控内存使用', () => {\n    const callback = vi.fn();\n    monitor.onMemoryUpdate(callback);\n    \n    monitor.start();\n    \n    act(() => {\n      vi.advanceTimersByTime(5000); // 触发内存检查\n    });\n    \n    expect(callback).toHaveBeenCalledWith(expect.any(Number));\n  });\n  \n  it('应该在超过阈值时发出警告', () => {\n    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});\n    \n    // 设置高内存使用\n    mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024; // 90MB\n    \n    monitor.start();\n    \n    act(() => {\n      vi.advanceTimersByTime(5000);\n    });\n    \n    expect(consoleSpy).toHaveBeenCalledWith(\n      expect.stringContaining('Memory usage high')\n    );\n    \n    consoleSpy.mockRestore();\n  });\n  \n  it('应该返回当前内存使用', () => {\n    const usage = monitor.getCurrentUsage();\n    expect(usage).toBe(50); // 50MB from mock\n  });\n});\n\ndescribe('FrameRateLimiter', () => {\n  it('应该正确限制帧率', () => {\n    const limiter = new FrameRateLimiter(30); // 30 FPS\n    \n    // 第一帧应该渲染\n    expect(limiter.shouldRender(0)).toBe(true);\n    \n    // 在间隔内的帧不应该渲染\n    expect(limiter.shouldRender(16)).toBe(false); // 16ms后\n    \n    // 超过间隔的帧应该渲染\n    expect(limiter.shouldRender(34)).toBe(true); // 34ms后 (> 33.33ms)\n  });\n  \n  it('应该支持动态更改目标FPS', () => {\n    const limiter = new FrameRateLimiter(60);\n    \n    expect(limiter.shouldRender(0)).toBe(true);\n    expect(limiter.shouldRender(16)).toBe(false); // 16ms < 16.67ms for 60fps\n    \n    limiter.setTargetFPS(30);\n    limiter.shouldRender(16); // 重置时间\n    \n    expect(limiter.shouldRender(50)).toBe(true); // 50ms > 33.33ms for 30fps\n  });\n});\n\ndescribe('useOptimizedAnimationFrame', () => {\n  beforeEach(() => {\n    vi.useFakeTimers();\n  });\n  \n  afterEach(() => {\n    vi.useRealTimers();\n  });\n  \n  it('应该正确管理动画帧', () => {\n    const callback = vi.fn();\n    \n    const { result } = renderHook(() =>\n      useOptimizedAnimationFrame(callback, [], { enableRaf: true, targetFPS: 60 })\n    );\n    \n    expect(mockRaf).toHaveBeenCalled();\n    \n    // 测试手动控制\n    act(() => {\n      result.current.stop();\n    });\n    \n    expect(mockCancelRaf).toHaveBeenCalled();\n    \n    act(() => {\n      result.current.start();\n    });\n    \n    expect(mockRaf).toHaveBeenCalledTimes(2);\n  });\n  \n  it('应该在禁用RAF时不启动动画', () => {\n    const callback = vi.fn();\n    \n    renderHook(() =>\n      useOptimizedAnimationFrame(callback, [], { enableRaf: false })\n    );\n    \n    // RAF不应该被调用（由于我们在setup中调用了，所以检查次数）\n    const initialCallCount = mockRaf.mock.calls.length;\n    \n    act(() => {\n      vi.advanceTimersByTime(100);\n    });\n    \n    expect(mockRaf).toHaveBeenCalledTimes(initialCallCount);\n  });\n});\n\ndescribe('useOptimizedState', () => {\n  it('应该优化状态更新', () => {\n    const selector = (state: { count: number }) => state.count * 2;\n    \n    const { result } = renderHook(() =>\n      useOptimizedState({ count: 1 }, selector, { enableMemoization: true })\n    );\n    \n    const [value, setValue] = result.current;\n    \n    expect(value).toBe(2); // count * 2\n    \n    act(() => {\n      setValue({ count: 2 });\n    });\n    \n    expect(result.current[0]).toBe(4); // 新的计算值\n  });\n  \n  it('应该处理选择器错误', () => {\n    const errorSelector = () => {\n      throw new Error('Selector error');\n    };\n    \n    const { result } = renderHook(() =>\n      useOptimizedState(1, errorSelector, { enableMemoization: true })\n    );\n    \n    // 应该返回undefined而不是抛出错误\n    expect(result.current[0]).toBeUndefined();\n  });\n});\n\ndescribe('usePerformanceMonitoring', () => {\n  beforeEach(() => {\n    vi.useFakeTimers();\n  });\n  \n  afterEach(() => {\n    vi.useRealTimers();\n  });\n  \n  it('应该提供性能指标', () => {\n    const { result } = renderHook(() =>\n      usePerformanceMonitoring({ enableProfiling: true })\n    );\n    \n    expect(result.current.metrics).toMatchObject({\n      fps: expect.any(Number),\n      memoryUsage: expect.any(Number),\n      isHighLoad: expect.any(Boolean)\n    });\n  });\n  \n  it('应该支持手动启动和停止', () => {\n    const { result } = renderHook(() =>\n      usePerformanceMonitoring({ enableProfiling: false })\n    );\n    \n    act(() => {\n      result.current.startProfiling();\n    });\n    \n    act(() => {\n      result.current.stopProfiling();\n    });\n    \n    // 测试通过，说明方法可以正常调用\n    expect(true).toBe(true);\n  });\n});\n\ndescribe('useGPUAcceleration', () => {\n  beforeEach(() => {\n    // 模拟WebGL支持\n    const mockCanvas = {\n      getContext: vi.fn().mockReturnValue({\n        getExtension: vi.fn().mockReturnValue({\n          UNMASKED_RENDERER_WEBGL: 'NVIDIA GeForce GTX 1080'\n        }),\n        getParameter: vi.fn().mockReturnValue('NVIDIA GeForce GTX 1080')\n      })\n    };\n    \n    global.document.createElement = vi.fn().mockReturnValue({\n      ...mockCanvas,\n      remove: vi.fn()\n    });\n  });\n  \n  it('应该检测GPU加速支持', () => {\n    const { result } = renderHook(() => useGPUAcceleration());\n    \n    expect(result.current.isSupported).toBe(true);\n  });\n  \n  it('应该启用和禁用GPU加速', () => {\n    const { result } = renderHook(() => useGPUAcceleration());\n    \n    const element = document.createElement('div');\n    \n    act(() => {\n      result.current.enableGPU(element);\n    });\n    \n    expect(element.style.willChange).toBe('transform');\n    expect(element.style.transform).toBe('translateZ(0)');\n    \n    act(() => {\n      result.current.disableGPU(element);\n    });\n    \n    expect(element.style.willChange).toBe('auto');\n    expect(element.style.transform).toBe('none');\n  });\n});\n\ndescribe('性能工具函数', () => {\n  it('getPerformanceRecommendations 应该提供有效建议', () => {\n    const lowFPS = getPerformanceRecommendations({ fps: 25, memoryUsage: 80 });\n    expect(lowFPS).toContain('考虑降低动画质量以提升帧率');\n    \n    const highMemory = getPerformanceRecommendations({ fps: 60, memoryUsage: 200 });\n    expect(highMemory).toContain('建议清理缓存以释放内存');\n    \n    const normal = getPerformanceRecommendations({ fps: 60, memoryUsage: 50 });\n    expect(normal).toHaveLength(0);\n  });\n  \n  it('autoTunePerformance 应该调整配置', () => {\n    const onConfigChange = vi.fn();\n    \n    // 低FPS情况\n    autoTunePerformance({ fps: 25, memoryUsage: 80 }, onConfigChange);\n    \n    expect(onConfigChange).toHaveBeenCalledWith(\n      expect.objectContaining({\n        targetFPS: 30,\n        enableGpu: true\n      })\n    );\n    \n    onConfigChange.mockClear();\n    \n    // 高内存情况\n    autoTunePerformance({ fps: 50, memoryUsage: 200 }, onConfigChange);\n    \n    expect(onConfigChange).toHaveBeenCalledWith(\n      expect.objectContaining({\n        enableMemoization: true\n      })\n    );\n  });\n});"