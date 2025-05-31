/// <reference types="cypress" />

import { mount } from "@cypress/react18";

// 扩展Cypress命令
declare global {
	namespace Cypress {
		interface Chainable {
			mount: typeof mount;
		}
	}
}

// 添加mount命令
Cypress.Commands.add("mount", mount);

// 示例: 组件测试的全局配置
beforeEach(() => {
	// 可以在这里添加每个组件测试前的设置
});

// 全局样式或配置
beforeEach(() => {
	// 可以在这里添加全局样式或配置
});

// 错误处理
Cypress.on("uncaught:exception", (err, runnable) => {
	// 忽略React开发模式下的一些警告
	if (
		err.message.includes("Warning:") ||
		err.message.includes("ReactDOM.render is no longer supported")
	) {
		return false;
	}
	return true;
});
