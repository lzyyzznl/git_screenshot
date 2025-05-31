# GifShot - 屏幕录制 GIF 插件

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/gifshot/chrome-extension)
[![TypeScript](https://img.shields.io/badge/typescript-5.3.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18.2.0-blue.svg)](https://reactjs.org/)
[![Plasmo](https://img.shields.io/badge/plasmo-0.90.5-purple.svg)](https://www.plasmo.com/)
[![Tests](https://img.shields.io/badge/tests-passing-green.svg)](https://cypress.io/)

一款基于 **Plasmo 框架** 开发的 Chrome 浏览器扩展，支持录制屏幕并生成 GIF 动图。

## 🚀 主要功能

- **多种录制模式**：当前标签页、整个桌面、应用窗口
- **实时预览**：录制过程中显示计时器和进度条
- **GIF 生成**：使用 gif.js 库将视频转换为 GIF
- **性能优化**：智能帧率控制、内存管理、超时保护
- **自定义设置**：录制时长、帧率可调节
- **一键保存**：支持直接下载生成的 GIF 文件
- **现代化界面**：基于 React 和 Less 的响应式设计
- **完整测试覆盖**：使用 Cypress 进行 E2E 和组件测试

## 🛠️ 技术栈

- **框架**: [Plasmo](https://www.plasmo.com/) v0.90.5 - 现代化浏览器扩展开发框架
- **前端**: React 18 + TypeScript
- **样式**: Less CSS 预处理器
- **GIF 生成**: gif.js v0.2.0 库
- **构建工具**: Plasmo 内置构建系统
- **测试框架**: Cypress 14.4.0
- **Chrome APIs**: desktopCapture, downloads, storage, tabs

## 📦 安装与开发

### 环境要求

- Node.js 16+
- Chrome 浏览器 88+
- Windows 10/11, macOS 10.15+, 或 Linux
- 推荐 4GB+ 内存

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd gifshot-chrome-extension

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 在 Chrome 中加载扩展
# 1. 打开 Chrome 扩展管理页面 (chrome://extensions/)
# 2. 开启"开发者模式"
# 3. 点击"加载已解压的扩展程序"
# 4. 选择 build/chrome-mv3-dev 目录
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 构建输出位于 build/chrome-mv3-prod/ 目录
```

### 打包发布

```bash
# 生成扩展包
npm run package

# 输出 .zip 文件用于发布到 Chrome Web Store
```

### 运行测试

```bash
# 运行所有测试（无头模式）
npm run test

# 打开Cypress GUI进行交互式测试
npm run test:open

# 只运行端到端测试
npm run test:e2e

# 只运行组件测试
npm run test:component

# CI环境下运行测试（先构建再测试）
npm run test:ci
```

## 🏗️ 项目结构

```
gifshot-chrome-extension/
├── assets/                 # 静态资源文件
│   ├── icon.png           # 主图标 (128x128)
│   ├── icon16.png         # 16x16 图标
│   ├── icon32.png         # 32x32 图标
│   ├── icon48.png         # 48x48 图标
│   ├── icon128.png        # 128x128 图标
│   └── gif.worker.js      # GIF 处理 Worker
├── tabs/                  # 标签页组件
│   ├── app.tsx            # 主应用页面 (React)
│   └── app.less           # 应用样式
├── utils/                 # 工具函数
│   └── gifGenerator.ts    # GIF 生成逻辑（已优化）
├── cypress/               # 测试文件
│   ├── e2e/              # 端到端测试
│   ├── component/        # 组件测试
│   ├── support/          # 测试支持文件
│   └── fixtures/         # 测试数据
├── build/                 # 构建输出目录
│   └── chrome-mv3-prod/   # 生产构建结果
├── popup.tsx              # 弹窗组件 (React)
├── popup.less             # 弹窗样式
├── background.ts          # 后台脚本 (Plasmo)
├── package.json           # 项目配置（包含 manifest）
├── tsconfig.json          # TypeScript 配置
├── cypress.config.ts      # Cypress 测试配置
├── README.md              # 项目文档
├── INSTALL.md             # 安装说明
└── product.md             # 产品说明
```

## 🎯 使用方法

### 基础使用

1. **安装扩展**：在 Chrome 浏览器中安装扩展
2. **打开录制**：点击扩展图标，选择录制类型
3. **开始录制**：授权屏幕共享权限，开始录制
4. **停止录制**：点击停止按钮或等待倒计时结束
5. **预览保存**：查看生成的 GIF，点击保存按钮下载

### 高级功能

- **完整版界面**：点击"完整版"按钮打开全功能页面
- **自定义设置**：调整录制时长（1-60秒）和帧率（6 FPS）
- **实时监控**：录制过程中查看时间和进度
- **质量优化**：自动调整视频尺寸以优化 GIF 文件大小
- **错误处理**：智能超时保护和错误恢复机制

### 性能建议

- 录制时长建议不超过 8 秒
- 录制分辨率会自动优化到 600x400
- 系统内存建议 4GB 以上以获得最佳体验

## 🔧 配置说明

### Manifest 配置

项目使用 Manifest V3 标准，主要权限包括：

- `desktopCapture`：屏幕录制权限
- `downloads`：文件下载权限
- `storage`：本地存储权限
- `tabs`：标签页操作权限
- `activeTab`：当前标签页访问权限

### 开发配置

- **TypeScript**：完整类型支持
- **Less**：CSS 预处理器
- **Plasmo**：自动化构建和热重载
- **React**：现代化组件开发
- **Cypress**：E2E 和组件测试

## 🧪 测试

本项目使用 Cypress 测试框架，提供完整的测试覆盖：

### 测试类型

- **端到端测试 (E2E)**：测试完整的用户工作流程
- **组件测试**：测试 React 组件的功能和交互
- **扩展集成测试**：测试 Chrome 扩展特定功能

### 测试功能

- 扩展弹窗加载和UI渲染
- 录制类型选择和设置保存
- 屏幕录制流程和计时器
- GIF生成、预览和下载
- 错误处理和异常情况

### 运行测试

详细的测试说明请查看 [`cypress/README.md`](cypress/README.md)。

## 🚀 部署发布

### Chrome Web Store 发布

1. 运行 `npm run package` 生成扩展包
2. 登录 [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole/)
3. 上传生成的 .zip 文件
4. 填写扩展信息和描述
5. 提交审核

### 手动安装

1. 下载项目源码
2. 运行 `npm run build`
3. 在 Chrome 中加载 `build/chrome-mv3-prod` 目录

## 🐛 问题排查

常见问题及解决方案请查看 [`INSTALL.md`](INSTALL.md)。

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

### 开发指南

1. Fork 本项目
2. 创建功能分支：`git checkout -b feature/新功能`
3. 编写测试：确保新功能有对应的测试
4. 提交更改：`git commit -m '添加新功能'`
5. 运行测试：`npm run test`
6. 推送分支：`git push origin feature/新功能`
7. 提交 Pull Request

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 React Hooks 最佳实践
- 为新功能编写对应的测试
- 保持代码简洁和可维护性

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🔄 更新日志

### v1.0.0 (2025-01-XX)

- **框架迁移**：从 Vue + Vite 迁移到 Plasmo + React
- **现代化重构**：采用 React Hooks 和 TypeScript
- **性能优化**：改进 GIF 生成算法和内存管理
- **界面更新**：全新的 UI 设计和交互体验
- **测试框架**：集成 Cypress 测试框架
- **错误处理**：添加超时保护和错误恢复机制
- **兼容性**：支持最新版本的 Chrome 浏览器

---

**Made with ❤️ by GifShot Team** 