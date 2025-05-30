# GifShot Chrome 插件安装指南

## 🚀 快速安装

### 1. 构建项目
```bash
yarn install
yarn build
```

### 2. 添加图标文件
由于图标文件较大，需要手动添加到 `extension/icons/` 目录：

**必需的图标文件：**
- `icon16.png` (16x16像素)
- `icon48.png` (48x48像素) 
- `icon128.png` (128x128像素)

**临时解决方案：**
1. 访问 [Favicon Generator](https://www.favicon-generator.org/)
2. 上传一个简单图片或使用文字"GIF"
3. 下载生成的图标包
4. 重命名为对应尺寸并放入 `extension/icons/` 目录

### 3. 安装到 Chrome
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `extension` 文件夹
6. 安装完成！

## 📁 完整的 extension 目录结构

构建后的 `extension` 目录应包含：

```
extension/
├── icons/
│   ├── icon16.png    (需要手动添加)
│   ├── icon48.png    (需要手动添加)
│   └── icon128.png   (需要手动添加)
├── background.js     (✅ 自动生成)
├── popup.css         (✅ 自动生成)
├── popup.js          (✅ 自动生成)
├── manifest.json     (✅ 自动复制)
└── src/
    └── popup.html    (✅ 自动生成)
```

## 🎯 使用说明

安装成功后：

1. 点击浏览器工具栏中的 GifShot 图标
2. 选择录制类型：
   - 📄 当前标签页
   - 🖥️ 整个桌面  
   - 📱 应用窗口
3. 设置录制时长（1-60秒）
4. 点击开始录制
5. 录制完成后预览和保存 GIF

## ⚠️ 注意事项

- 首次使用需要授权屏幕录制权限
- 支持 Chrome 88+ 版本
- GIF 文件将自动下载到默认下载目录

## 🔧 开发模式

如需修改代码：

```bash
# 监听文件变化，自动重新构建
yarn dev

# 手动构建
yarn build
```

修改代码后需要在 Chrome 扩展管理页面点击"重新加载"按钮。 