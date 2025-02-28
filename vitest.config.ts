import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,  // 使用 Jest 风格的全局 API
    environment: 'jsdom',  // 设置测试环境
    include: ['src/**/*.test.{ts,js}'],  // 匹配测试文件

    coverage: {
      provider: 'v8',  // 使用 v8 引擎作为覆盖率提供者
      reporter: ['text', 'html', 'lcov'],  // 生成不同格式的报告
      reportsDirectory: './coverage',  // 指定报告输出目录
    },
  },
})
