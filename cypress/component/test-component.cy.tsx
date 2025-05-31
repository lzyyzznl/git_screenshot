/// <reference types="cypress" />
import React from "react";

// 简单的测试组件
const TestComponent: React.FC<{ title: string }> = ({ title }) => {
	const [count, setCount] = React.useState(0);

	return (
		<div>
			<h1 data-testid="title">{title}</h1>
			<p data-testid="count">计数: {count}</p>
			<button data-testid="increment-btn" onClick={() => setCount(count + 1)}>
				增加
			</button>
		</div>
	);
};

describe("组件测试", () => {
	it("应该能够渲染React组件", () => {
		// 挂载组件
		cy.mount(<TestComponent title="测试标题" />);

		// 验证组件渲染
		cy.get('[data-testid="title"]').should("contain", "测试标题");
		cy.get('[data-testid="count"]').should("contain", "计数: 0");
	});

	it("应该能够处理用户交互", () => {
		cy.mount(<TestComponent title="交互测试" />);

		// 测试按钮点击
		cy.get('[data-testid="increment-btn"]').click();
		cy.get('[data-testid="count"]').should("contain", "计数: 1");

		// 多次点击
		cy.get('[data-testid="increment-btn"]').click().click();
		cy.get('[data-testid="count"]').should("contain", "计数: 3");
	});

	it("应该能够传递不同的props", () => {
		cy.mount(<TestComponent title="不同标题" />);
		cy.get('[data-testid="title"]').should("contain", "不同标题");
	});
});
