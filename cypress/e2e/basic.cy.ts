/// <reference types="cypress" />

describe("基本配置测试", () => {
	beforeEach(() => {
		// 全面清理测试环境
		cy.clearAllTestArtifacts();

		// 访问测试页面
		cy.visit("cypress/fixtures/test.html");

		// 模拟Chrome API（在访问页面后）
		cy.mockChromeAPI();
	});

	afterEach(() => {
		// 测试后清理
		cy.clearAllTestArtifacts();
	});

	it("应该能够加载测试页面", () => {
		// 验证页面元素
		cy.get("h1").should("contain", "Cypress测试");
		cy.get("#test").should("contain", "配置正确");

		// 验证JavaScript执行
		cy.window().then((win) => {
			expect((win as any).testData).to.exist;
			expect((win as any).testData.loaded).to.be.true;
		});
	});

	it("应该能够使用自定义命令", () => {
		// 测试自定义的waitForElement命令
		cy.waitForElement("#test-btn");

		// 测试clickIfExists命令
		cy.clickIfExists("#test-btn");

		// 验证按钮存在
		cy.get("#test-btn").should("be.visible");
	});

	it("应该能够模拟Chrome扩展API", () => {
		cy.window().then((win) => {
			// 验证Chrome API被正确模拟
			cy.log("检查window.chrome对象");
			expect(win.chrome, "window.chrome应该存在").to.exist;

			cy.log("检查chrome.storage对象");
			expect(win.chrome.storage, "chrome.storage应该存在").to.exist;

			cy.log("检查chrome.desktopCapture对象");
			expect(win.chrome.desktopCapture, "chrome.desktopCapture应该存在").to
				.exist;

			cy.log("检查chrome.tabs对象");
			expect(win.chrome.tabs, "chrome.tabs应该存在").to.exist;

			cy.log("检查chrome.runtime对象");
			expect(win.chrome.runtime, "chrome.runtime应该存在").to.exist;
		});
	});

	it("应该能够处理DOM交互", () => {
		// 测试基本的DOM操作
		cy.get("#chrome-test").should("contain", "Chrome API测试");
		cy.get("#test-btn").click();
		cy.get("#test-btn").should("be.visible");
	});
});
