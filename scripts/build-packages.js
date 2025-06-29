#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// 读取package.json获取版本信息
const packageJson = JSON.parse(
	fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
);
const version = packageJson.version;

console.log(`🚀 Building packages for version ${version}...`);

// 清理之前的构建
console.log("🧹 Cleaning previous builds...");
try {
	execSync("npm run clean", { stdio: "inherit", cwd: projectRoot });
} catch (error) {
	console.log("No previous builds to clean");
}

// 构建Chrome版本
console.log("🏗️  Building Chrome extension...");
try {
	execSync("npm run build:chrome", { stdio: "inherit", cwd: projectRoot });
	console.log("✅ Chrome build completed");
} catch (error) {
	console.error("❌ Chrome build failed:", error.message);
	process.exit(1);
}

// 构建Firefox版本
console.log("🏗️  Building Firefox addon...");
try {
	execSync("npm run build:firefox", { stdio: "inherit", cwd: projectRoot });
	console.log("✅ Firefox build completed");
} catch (error) {
	console.error("❌ Firefox build failed:", error.message);
	process.exit(1);
}

// 创建ZIP包
console.log("📦 Creating ZIP packages...");
try {
	execSync("npm run zip:all", { stdio: "inherit", cwd: projectRoot });
	console.log("✅ ZIP packages created");
} catch (error) {
	console.error("❌ ZIP packaging failed:", error.message);
	process.exit(1);
}

// 显示构建结果
const distDir = path.join(projectRoot, "dist");
if (fs.existsSync(distDir)) {
	console.log("\n📁 Build output:");
	const files = fs.readdirSync(distDir);
	files.forEach((file) => {
		const filePath = path.join(distDir, file);
		const stats = fs.statSync(filePath);
		if (stats.isFile() && file.endsWith(".zip")) {
			const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
			console.log(`  📄 ${file} (${sizeInMB} MB)`);
		} else if (stats.isDirectory()) {
			console.log(`  📁 ${file}/`);
		}
	});
}

console.log("\n🎉 All packages built successfully!");
console.log("\n📋 Next steps:");
console.log("  • Test the extensions by loading them in Chrome and Firefox");
console.log("  • Upload to Chrome Web Store and Firefox Add-ons");
console.log("  • Update version and create release notes");
