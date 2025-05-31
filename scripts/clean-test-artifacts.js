#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// 需要清理的目录列表
const cleanupDirs = [
	"cypress/videos",
	"cypress/screenshots",
	"cypress/downloads",
];

// 需要清理的文件模式
const cleanupFiles = [
	"cypress/**/*.mp4",
	"cypress/**/*.png",
	"cypress/**/*.jpg",
	"cypress/**/*.gif",
	"cypress/**/*.json",
];

function cleanDirectory(dirPath) {
	const fullPath = path.join(process.cwd(), dirPath);

	if (fs.existsSync(fullPath)) {
		try {
			// 删除目录内容
			fs.rmSync(fullPath, { recursive: true, force: true });
			// 重新创建空目录
			fs.mkdirSync(fullPath, { recursive: true });
			console.log(`✅ 已清理目录: ${dirPath}`);
		} catch (error) {
			console.error(`❌ 清理目录失败 ${dirPath}:`, error.message);
		}
	} else {
		// 如果目录不存在，创建它
		fs.mkdirSync(fullPath, { recursive: true });
		console.log(`📁 已创建目录: ${dirPath}`);
	}
}

function main() {
	console.log("🧹 开始清理Cypress测试文件...\n");

	// 清理指定目录
	cleanupDirs.forEach(cleanDirectory);

	console.log("\n✨ 测试文件清理完成！所有临时文件已删除。");
	console.log("\n📝 清理内容包括:");
	console.log("   - 测试视频文件 (*.mp4)");
	console.log("   - 测试截图文件 (*.png)");
	console.log("   - 下载的测试文件");
	console.log("   - 其他临时测试文件");
}

// 如果直接运行此脚本
if (require.main === module) {
	main();
}

module.exports = { cleanDirectory, cleanupDirs };
