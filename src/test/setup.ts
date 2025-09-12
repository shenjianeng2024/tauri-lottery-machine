/**
 * 测试环境设置文件
 */

import '@testing-library/jest-dom';

// Mock crypto.getRandomValues for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint32Array) => {
      // 为测试提供可预测的随机数
      // 在实际测试中，我们会在具体测试用例中 mock 这个函数
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 4294967296);
      }
      return arr;
    },
  },
});

// Mock Date.now for deterministic testing
const originalDateNow = Date.now;
global.mockDateNow = (timestamp?: number) => {
  if (timestamp !== undefined) {
    Date.now = vi.fn(() => timestamp);
  } else {
    Date.now = originalDateNow;
  }
};

// Restore Date.now after each test
afterEach(() => {
  Date.now = originalDateNow;
});

declare global {
  var mockDateNow: (timestamp?: number) => void;
}