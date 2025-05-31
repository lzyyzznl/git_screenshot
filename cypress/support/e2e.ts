/// <reference types="cypress" />

import "./commands";

// 全局配置
Cypress.on("uncaught:exception", (err, runnable) => {
	// 防止因为扩展的uncaught exception导致测试失败
	if (err.message.includes("Extension")) {
		return false;
	}
	return true;
});

// 扩展相关的自定义命令
declare global {
	namespace Cypress {
		interface Chainable {
			/**
			 * 获取Chrome扩展ID
			 */
			getExtensionId(): Chainable<string>;

			/**
			 * 打开扩展弹窗
			 */
			openExtensionPopup(): Chainable<void>;

			/**
			 * 开始屏幕录制
			 */
			startScreenRecording(): Chainable<void>;

			/**
			 * 停止屏幕录制
			 */
			stopScreenRecording(): Chainable<void>;

			/**
			 * 等待GIF生成完成
			 */
			waitForGifGeneration(): Chainable<void>;

			/**
			 * 测试扩展权限
			 */
			checkExtensionPermissions(): Chainable<void>;
		}
	}
}

// 获取扩展ID的命令
Cypress.Commands.add("getExtensionId", () => {
	return cy.window().then((win) => {
		return new Promise((resolve) => {
			// 模拟扩展ID获取
			const mockExtensionId = "test-extension-id-" + Date.now();
			resolve(mockExtensionId);
		});
	});
});

// 打开扩展弹窗的命令
Cypress.Commands.add("openExtensionPopup", () => {
	// 对于Chrome扩展测试，我们需要导航到popup页面
	cy.visit("chrome-extension://test-extension-id/popup.html", {
		failOnStatusCode: false,
	});
});

// 开始屏幕录制的命令
Cypress.Commands.add("startScreenRecording", () => {
	cy.get('[data-testid="record-tab"]').should("be.visible").click();
	cy.get('[data-testid="start-recording"]').should("be.visible").click();
});

// 停止屏幕录制的命令
Cypress.Commands.add("stopScreenRecording", () => {
	cy.get('[data-testid="stop-recording"]').should("be.visible").click();
});

// 等待GIF生成完成的命令
Cypress.Commands.add("waitForGifGeneration", () => {
	cy.get('[data-testid="gif-preview"]', { timeout: 60000 }).should(
		"be.visible"
	);
});

// 检查扩展权限的命令
Cypress.Commands.add("checkExtensionPermissions", () => {
	cy.window().then((win) => {
		// 检查必要的API是否可用
		expect(win.chrome).to.exist;
		expect(win.chrome.desktopCapture).to.exist;
		expect(win.chrome.storage).to.exist;
	});
});
