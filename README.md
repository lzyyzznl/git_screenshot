# 🎬 浏览器录屏助手

功能强大的浏览器录屏工具，支持屏幕注释、视频转换和多格式导出。

## ✨ 功能特性

- 🎥 **多种录制模式**：支持整个屏幕、窗口、标签页录制
- ✏️ **实时注释**：录制过程中支持画笔、荧光笔、箭头等绘图工具
- 🎨 **丰富工具**：12 种颜色选择，可调节画笔大小，撤销/重做功能
- 📹 **格式转换**：支持 WebM 转 MP4、GIF 格式
- ⌨️ **快捷键**：完整的键盘快捷键支持
- 🔧 **性能优化**：智能内存管理和录制质量自适应
- 🌏 **跨浏览器**：支持 Chrome、Firefox、Edge 等主流浏览器
- 📱 **响应式 UI**：现代化的用户界面设计

## 🚀 技术栈

- **框架**：Vue 3 + Composition API
- **构建工具**：WXT (Web Extension Tools)
- **UI 库**：Element Plus
- **样式**：UnoCSS
- **类型安全**：TypeScript
- **图标**：Iconify
- **视频处理**：MediaRecorder API + Web Workers

## 🛠️ 开发环境

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- Chrome >= 88 或 Firefox >= 109

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# Chrome开发模式
npm run dev

# Firefox开发模式
npm run dev:firefox
```

### 构建生产版本

```bash
# 构建所有浏览器版本
npm run build:all

# 构建Chrome版本
npm run build:chrome

# 构建Firefox版本
npm run build:firefox
```

### 打包分发

```bash
# 创建所有浏览器的ZIP包
npm run package

# 创建Chrome ZIP包
npm run zip:chrome

# 创建Firefox ZIP包
npm run zip:firefox
```

## 📦 项目结构

```
browser-screen-recorder/
├── entrypoints/           # 扩展入口点
│   ├── background/        # 后台脚本
│   ├── content/          # 内容脚本
│   ├── popup/            # 弹出窗口
│   └── result/           # 结果页面
├── components/           # Vue组件
├── composables/          # Vue 3 Composables
├── utils/               # 工具函数
├── workers/             # Web Workers
├── types/               # TypeScript类型定义
├── public/              # 静态资源
│   └── icon/            # 扩展图标
├── scripts/             # 构建脚本
├── dist/                # 构建输出
└── .wxt/                # WXT缓存
```

## 🔧 开发指南

### 添加新功能

1. 在相应目录创建新文件
2. 更新类型定义（如需要）
3. 添加单元测试
4. 更新文档

### 调试扩展

1. 运行开发模式：`npm run dev`
2. 在 Chrome 中打开扩展管理页面
3. 加载未打包的扩展：选择`.wxt/chrome-mv3`目录
4. 查看控制台输出和调试信息

### 版本管理

```bash
# 升级补丁版本（1.0.0 -> 1.0.1）
npm run release:patch

# 升级次版本（1.0.0 -> 1.1.0）
npm run release:minor

# 升级主版本（1.0.0 -> 2.0.0）
npm run release:major
```

## 📋 部署清单

### Chrome Web Store

1. 构建 Chrome 版本：`npm run build:chrome`
2. 创建 ZIP 包：`npm run zip:chrome`
3. 登录[Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole)
4. 上传 ZIP 文件
5. 填写商店信息和截图
6. 提交审核

### Firefox Add-ons

1. 构建 Firefox 版本：`npm run build:firefox`
2. 创建 ZIP 包：`npm run zip:firefox`
3. 登录[Firefox 开发者中心](https://addons.mozilla.org/developers/)
4. 上传 ZIP 文件
5. 填写附加组件信息
6. 提交审核

### 发布前检查

- [ ] 版本号已更新
- [ ] 功能测试完成
- [ ] 权限声明正确
- [ ] 图标和截图准备
- [ ] 商店描述更新
- [ ] 隐私政策确认

## 🧪 测试

```bash
# 类型检查
npm run compile

# 代码检查
npm run lint

# 单元测试
npm test
```

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/screen-recorder/browser-extension/issues)
- 发送邮件至：support@screenrecorder.com

---

**快捷键参考**

| 功能            | Windows/Linux | macOS       |
| --------------- | ------------- | ----------- |
| 停止录制        | Ctrl+Shift+R  | Cmd+Shift+R |
| 暂停/恢复       | Ctrl+Shift+P  | Cmd+Shift+P |
| 显示/隐藏工具栏 | Ctrl+Shift+H  | Cmd+Shift+H |
| 撤销            | Ctrl+Z        | Cmd+Z       |
| 重做            | Ctrl+Y        | Cmd+Y       |
