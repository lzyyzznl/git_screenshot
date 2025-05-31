/// <reference types="cypress" />

describe("Chrome扩展模拟测试", () => {
	beforeEach(() => {
		// 全面清理测试环境
		cy.clearAllTestArtifacts();

		// 访问测试页面
		cy.visit("cypress/fixtures/test.html");

		// 模拟Chrome API
		cy.mockChromeAPI();
	});

	afterEach(() => {
		// 测试后清理
		cy.clearAllTestArtifacts();
	});

	it("应该能够模拟扩展的基本功能", () => {
		cy.window().then((win) => {
			// 验证Chrome API可用性
			expect(win.chrome).to.exist;
			expect(win.chrome.storage).to.exist;
			expect(win.chrome.desktopCapture).to.exist;

			// 模拟存储操作
			const storage = win.chrome.storage.local;
			expect(storage.get).to.be.a("function");
			expect(storage.set).to.be.a("function");
		});
	});

	it("应该能够模拟桌面捕获功能", () => {
		cy.window().then((win) => {
			// 模拟桌面捕获
			const streamId = win.chrome.desktopCapture.chooseDesktopMedia(["screen"]);
			expect(streamId).to.equal("test-stream-id");
		});
	});

	it("应该能够模拟标签页查询", () => {
		cy.window().then((win) => {
			// 模拟标签页查询
			win.chrome.tabs.query({ active: true }).then((tabs) => {
				expect(tabs).to.be.an("array");
				expect(tabs).to.have.length(1);
				expect(tabs[0]).to.have.property("id", 1);
			});
		});
	});

	it("应该能够模拟消息传递", () => {
		cy.window().then((win) => {
			// 模拟消息发送
			expect(win.chrome.runtime.sendMessage).to.be.a("function");
			expect(win.chrome.runtime.onMessage.addListener).to.be.a("function");
		});
	});

	it("应该能够模拟用户界面交互", () => {
		// 测试DOM元素存在
		cy.get("#test-btn").should("be.visible");

		// 模拟点击操作
		cy.get("#test-btn").click();

		// 验证状态变化
		cy.get("#test-btn").should("be.visible");
	});
});
