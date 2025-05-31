# Cypress 测试套件说明

## 📋 测试概述

本项目使用 Cypress 14.4.0 进行端到端测试和React组件测试，确保Chrome扩展功能的正确性和稳定性。

## 🧪 测试类型

### 1. E2E 测试 (End-to-End)
- **位置**: `cypress/e2e/`
- **目的**: 测试完整的用户工作流程
- **浏览器支持**: Electron, Edge
- **测试文件**:
  - `basic.cy.ts` - 基础配置和环境测试
  - `extension-simulation.cy.ts` - Chrome扩展API模拟测试

### 2. 组件测试 (Component)
- **位置**: `cypress/component/`
- **目的**: 测试React组件的功能和交互
- **框架**: React 18 + TypeScript
- **测试文件**:
  - `test-component.cy.tsx` - 基础React组件测试

## 🚀 运行测试

### 快速开始
```bash
# 运行所有测试（推荐）
npm run test

# 打开Cypress GUI
npm run test:open

# 仅运行E2E测试
npm run test:e2e

# 仅运行组件测试
npm run test:component

# CI模式（构建后测试）
npm run test:ci
```

### 手动清理
```bash
# 清理测试产生的文件
npm run test:clean-only
```

## 🔧 测试配置

### 核心配置文件
- `cypress.config.ts` - 主配置文件
- `tsconfig.json` - TypeScript配置
- `webpack.config.js` - 组件测试构建配置

### 支持文件
- `cypress/support/e2e.ts` - E2E测试支持
- `cypress/support/component.ts` - 组件测试支持
- `cypress/support/commands.ts` - 自定义命令
- `cypress/fixtures/test.html` - 测试HTML页面

## 🛠️ 自定义命令

### 通用命令
- `cy.waitForElement(selector)` - 等待元素出现
- `cy.clickIfExists(selector)` - 点击元素（如果存在）
- `cy.clearTestData()` - 清理基础测试数据
- `cy.clearAllTestArtifacts()` - 全面清理测试环境

### Chrome扩展命令
- `cy.mockChromeAPI()` - 模拟Chrome扩展API
- `cy.getExtensionId()` - 获取扩展ID
- `cy.checkExtensionPermissions()` - 检查扩展权限

## 🧹 清理机制

### 自动清理
测试运行时会自动执行以下清理操作：
1. **测试前清理**: 清空所有测试目录
2. **每个测试清理**: 清理浏览器存储和全局变量
3. **测试后清理**: 删除生成的视频、截图等文件

### 清理目录
- `cypress/videos/` - 测试视频文件
- `cypress/screenshots/` - 测试截图文件
- `cypress/downloads/` - 下载的测试文件

### 清理内容
- 测试视频 (*.mp4)
- 测试截图 (*.png, *.jpg)
- 临时下载文件
- 浏览器存储数据
- 全局测试变量

## 📊 测试覆盖

### E2E测试覆盖
✅ 页面加载和基础配置  
✅ 自定义命令功能验证  
✅ Chrome扩展API模拟  
✅ DOM交互和状态管理  
✅ 扩展功能模拟测试  
✅ 桌面捕获功能模拟  
✅ 标签页查询和消息传递  

### 组件测试覆盖
✅ React组件渲染  
✅ 用户交互处理  
✅ Props传递和状态更新  
✅ 事件处理和生命周期  

## 🔍 故障排除

### 常见问题

1. **Chrome浏览器检测失败**
   - 解决方案：使用 Electron 或 Edge 浏览器
   - 命令：`npx cypress run --browser electron`

2. **组件测试编译错误**
   - 检查 `webpack.config.js` 配置
   - 确保 TypeScript 和 React 依赖正确安装

3. **测试文件未清理**
   - 运行：`npm run test:clean-only`
   - 检查 `scripts/clean-test-artifacts.js`

4. **扩展API模拟失败**
   - 确保在测试前调用 `cy.mockChromeAPI()`
   - 检查 `cypress/support/commands.ts` 中的API定义

### 调试技巧

```bash
# 在GUI模式下运行以便调试
npm run test:open

# 运行特定测试文件
npx cypress run --spec "cypress/e2e/basic.cy.ts"

# 获取详细日志
npx cypress run --browser electron --config video=true
```

## 📈 性能优化

### 测试速度优化
- 使用 `beforeEach` 和 `afterEach` 进行高效清理
- 模拟外部API而非真实调用
- 合理设置超时时间和重试次数

### 资源优化
- 自动清理测试产生的文件
- 使用无头浏览器模式减少资源占用
- 并行运行测试（CI环境）

## 📝 测试最佳实践

1. **测试独立性**: 每个测试应该独立运行
2. **数据清理**: 使用 `clearAllTestArtifacts()` 确保环境干净
3. **选择器稳定性**: 使用 `data-testid` 属性
4. **错误处理**: 合理设置重试和超时
5. **模拟API**: 使用模拟而非真实的Chrome扩展环境

---

> **注意**: 所有测试都设计为"无痕"运行，确保测试环境的干净和可重复性。 