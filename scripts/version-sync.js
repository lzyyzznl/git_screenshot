#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

const packageJsonPath = path.join(projectRoot, "package.json");
const wxtConfigPath = path.join(projectRoot, "wxt.config.ts");

// 读取package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

console.log(`📋 Syncing version ${version} across all configuration files...`);

// 更新wxt.config.ts中的版本
let wxtConfig = fs.readFileSync(wxtConfigPath, "utf8");

// 匹配并替换版本字符串
const versionPattern = /version:\s*["'][^"']*["']/;
const newVersionLine = `version: "${version}"`;

if (versionPattern.test(wxtConfig)) {
	wxtConfig = wxtConfig.replace(versionPattern, newVersionLine);
	fs.writeFileSync(wxtConfigPath, wxtConfig, "utf8");
	console.log("✅ Updated wxt.config.ts");
} else {
	console.warn("⚠️  Could not find version field in wxt.config.ts");
}

// 验证版本同步
console.log("\n🔍 Version verification:");
console.log(`  package.json: ${packageJson.version}`);

// 从更新后的wxt.config.ts读取版本
const updatedWxtConfig = fs.readFileSync(wxtConfigPath, "utf8");
const versionMatch = updatedWxtConfig.match(/version:\s*["']([^"']*)["']/);
if (versionMatch) {
	console.log(`  wxt.config.ts: ${versionMatch[1]}`);

	if (packageJson.version === versionMatch[1]) {
		console.log("✅ All versions are synchronized");
	} else {
		console.error("❌ Version mismatch detected");
		process.exit(1);
	}
} else {
	console.warn("⚠️  Could not extract version from wxt.config.ts");
}

// 生成版本信息文件
const versionInfo = {
	version: packageJson.version,
	name: packageJson.name,
	description: packageJson.description,
	buildDate: new Date().toISOString(),
	commit: process.env.GIT_COMMIT || "unknown",
	branch: process.env.GIT_BRANCH || "unknown",
};

const versionInfoPath = path.join(projectRoot, "public", "version.json");
const publicDir = path.dirname(versionInfoPath);

// 创建public目录如果不存在
if (!fs.existsSync(publicDir)) {
	fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2), "utf8");
console.log("✅ Generated version.json");

console.log("\n🎯 Version sync completed successfully!");
