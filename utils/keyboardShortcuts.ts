export interface ShortcutConfig {
	key: string;
	callback: () => void;
	description: string;
	category: "recording" | "drawing" | "general";
	enabled?: boolean;
}

export interface ShortcutContext {
	recording: boolean;
	drawing: boolean;
	overlay: boolean;
}

export class KeyboardShortcutManager {
	private shortcuts: Map<string, ShortcutConfig> = new Map();
	private enabled = false;
	private context: ShortcutContext = {
		recording: false,
		drawing: false,
		overlay: false,
	};
	private helpVisible = false;
	private helpElement?: HTMLElement;

	constructor() {
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.setupDefaultShortcuts();
	}

	/**
	 * 设置默认快捷键
	 */
	private setupDefaultShortcuts(): void {
		const defaultShortcuts: ShortcutConfig[] = [
			// 录制控制
			{
				key: "ctrl+shift+r",
				callback: () => this.triggerAction("stop-recording"),
				description: "停止录制",
				category: "recording",
			},
			{
				key: "ctrl+shift+p",
				callback: () => this.triggerAction("pause-resume"),
				description: "暂停/继续录制",
				category: "recording",
			},
			{
				key: "ctrl+shift+h",
				callback: () => this.triggerAction("toggle-overlay"),
				description: "显示/隐藏工具栏",
				category: "recording",
			},

			// 绘图工具切换
			{
				key: "p",
				callback: () => this.triggerAction("tool-pen"),
				description: "选择钢笔工具",
				category: "drawing",
			},
			{
				key: "h",
				callback: () => this.triggerAction("tool-highlighter"),
				description: "选择荧光笔工具",
				category: "drawing",
			},
			{
				key: "a",
				callback: () => this.triggerAction("tool-arrow"),
				description: "选择箭头工具",
				category: "drawing",
			},
			{
				key: "e",
				callback: () => this.triggerAction("tool-eraser"),
				description: "选择橡皮擦工具",
				category: "drawing",
			},

			// 绘图操作
			{
				key: "ctrl+z",
				callback: () => this.triggerAction("undo"),
				description: "撤销",
				category: "drawing",
			},
			{
				key: "ctrl+y",
				callback: () => this.triggerAction("redo"),
				description: "重做",
				category: "drawing",
			},
			{
				key: "ctrl+shift+c",
				callback: () => this.triggerAction("clear-canvas"),
				description: "清除画布",
				category: "drawing",
			},

			// 颜色选择 (数字键1-9)
			{
				key: "1",
				callback: () => this.triggerAction("color-red"),
				description: "红色",
				category: "drawing",
			},
			{
				key: "2",
				callback: () => this.triggerAction("color-blue"),
				description: "蓝色",
				category: "drawing",
			},
			{
				key: "3",
				callback: () => this.triggerAction("color-green"),
				description: "绿色",
				category: "drawing",
			},
			{
				key: "4",
				callback: () => this.triggerAction("color-yellow"),
				description: "黄色",
				category: "drawing",
			},
			{
				key: "5",
				callback: () => this.triggerAction("color-orange"),
				description: "橙色",
				category: "drawing",
			},
			{
				key: "6",
				callback: () => this.triggerAction("color-purple"),
				description: "紫色",
				category: "drawing",
			},
			{
				key: "7",
				callback: () => this.triggerAction("color-pink"),
				description: "粉色",
				category: "drawing",
			},
			{
				key: "8",
				callback: () => this.triggerAction("color-black"),
				description: "黑色",
				category: "drawing",
			},
			{
				key: "9",
				callback: () => this.triggerAction("color-white"),
				description: "白色",
				category: "drawing",
			},

			// 画笔大小调整
			{
				key: "[",
				callback: () => this.triggerAction("brush-smaller"),
				description: "减小画笔",
				category: "drawing",
			},
			{
				key: "]",
				callback: () => this.triggerAction("brush-larger"),
				description: "增大画笔",
				category: "drawing",
			},

			// 通用功能
			{
				key: "f1",
				callback: () => this.toggleHelp(),
				description: "显示/隐藏快捷键帮助",
				category: "general",
			},
			{
				key: "escape",
				callback: () => this.triggerAction("escape"),
				description: "取消当前操作",
				category: "general",
			},
		];

		defaultShortcuts.forEach((shortcut) => {
			this.shortcuts.set(shortcut.key, shortcut);
		});
	}

	/**
	 * 注册自定义快捷键
	 */
	registerShortcut(config: ShortcutConfig): void {
		this.shortcuts.set(config.key.toLowerCase(), {
			...config,
			enabled: config.enabled !== false,
		});
	}

	/**
	 * 取消注册快捷键
	 */
	unregisterShortcut(key: string): void {
		this.shortcuts.delete(key.toLowerCase());
	}

	/**
	 * 启用快捷键监听
	 */
	enable(): void {
		if (!this.enabled) {
			document.addEventListener("keydown", this.handleKeyDown, {
				passive: false,
			});
			this.enabled = true;
		}
	}

	/**
	 * 禁用快捷键监听
	 */
	disable(): void {
		if (this.enabled) {
			document.removeEventListener("keydown", this.handleKeyDown);
			this.enabled = false;
			this.hideHelp();
		}
	}

	/**
	 * 更新上下文状态
	 */
	updateContext(newContext: Partial<ShortcutContext>): void {
		this.context = { ...this.context, ...newContext };
	}

	/**
	 * 处理键盘事件
	 */
	private handleKeyDown(event: KeyboardEvent): void {
		// 忽略在输入框中的按键
		const target = event.target as HTMLElement;
		if (
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.contentEditable === "true")
		) {
			return;
		}

		const keyCombo = this.buildKeyCombo(event);
		const shortcut = this.shortcuts.get(keyCombo);

		if (shortcut && this.shouldExecuteShortcut(shortcut)) {
			event.preventDefault();
			event.stopPropagation();
			shortcut.callback();
		}
	}

	/**
	 * 构建按键组合字符串
	 */
	private buildKeyCombo(event: KeyboardEvent): string {
		const keys: string[] = [];

		if (event.ctrlKey) keys.push("ctrl");
		if (event.shiftKey) keys.push("shift");
		if (event.altKey) keys.push("alt");
		if (event.metaKey) keys.push("meta");

		// 特殊键处理
		const key = event.key.toLowerCase();
		if (!["control", "shift", "alt", "meta"].includes(key)) {
			keys.push(key);
		}

		return keys.join("+");
	}

	/**
	 * 判断是否应该执行快捷键
	 */
	private shouldExecuteShortcut(shortcut: ShortcutConfig): boolean {
		if (!shortcut.enabled) return false;

		// 根据当前上下文判断是否可以执行
		switch (shortcut.category) {
			case "recording":
				return this.context.recording;
			case "drawing":
				return this.context.drawing && this.context.overlay;
			case "general":
				return true;
			default:
				return true;
		}
	}

	/**
	 * 触发动作（由外部组件处理）
	 */
	private triggerAction(action: string): void {
		// 发送消息给background script或直接调用回调
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("shortcut-action", {
					detail: { action, context: this.context },
				})
			);
		}
	}

	/**
	 * 获取所有快捷键信息
	 */
	getShortcuts(): ShortcutConfig[] {
		return Array.from(this.shortcuts.values());
	}

	/**
	 * 按类别获取快捷键
	 */
	getShortcutsByCategory(category: string): ShortcutConfig[] {
		return this.getShortcuts().filter(
			(shortcut) => shortcut.category === category
		);
	}

	/**
	 * 显示/隐藏帮助界面
	 */
	toggleHelp(): void {
		if (this.helpVisible) {
			this.hideHelp();
		} else {
			this.showHelp();
		}
	}

	/**
	 * 显示帮助界面
	 */
	private showHelp(): void {
		if (this.helpElement) return;

		this.helpElement = document.createElement("div");
		this.helpElement.className = "shortcut-help-overlay";
		this.helpElement.innerHTML = this.generateHelpHTML();

		// 添加样式
		this.helpElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

		document.body.appendChild(this.helpElement);
		this.helpVisible = true;

		// 点击外部关闭
		this.helpElement.addEventListener("click", (e) => {
			if (e.target === this.helpElement) {
				this.hideHelp();
			}
		});
	}

	/**
	 * 隐藏帮助界面
	 */
	private hideHelp(): void {
		if (this.helpElement) {
			document.body.removeChild(this.helpElement);
			this.helpElement = undefined;
			this.helpVisible = false;
		}
	}

	/**
	 * 生成帮助界面HTML
	 */
	private generateHelpHTML(): string {
		const categories = {
			recording: "录制控制",
			drawing: "绘图工具",
			general: "通用功能",
		};

		let html = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        ">
          <h2 style="margin: 0; color: #1f2937; font-size: 20px;">键盘快捷键</h2>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
            padding: 4px;
            border-radius: 4px;
          ">×</button>
        </div>
    `;

		Object.entries(categories).forEach(([category, title]) => {
			const shortcuts = this.getShortcutsByCategory(category);
			if (shortcuts.length === 0) return;

			html += `
        <div style="margin-bottom: 24px;">
          <h3 style="
            margin: 0 0 12px 0;
            color: #374151;
            font-size: 16px;
            font-weight: 600;
          ">${title}</h3>
          <div style="display: grid; gap: 8px;">
      `;

			shortcuts.forEach((shortcut) => {
				const keys = shortcut.key.split("+").map((key) => {
					const keyMap: { [key: string]: string } = {
						ctrl: "Ctrl",
						shift: "Shift",
						alt: "Alt",
						meta: "Cmd",
						escape: "Esc",
						" ": "Space",
					};
					return keyMap[key] || key.toUpperCase();
				});

				html += `
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f9fafb;
            border-radius: 6px;
          ">
            <span style="color: #374151; font-size: 14px;">${
							shortcut.description
						}</span>
            <div style="display: flex; gap: 4px;">
              ${keys
								.map(
									(key) => `
                <kbd style="
                  background: #e5e7eb;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  padding: 2px 6px;
                  font-size: 12px;
                  font-family: monospace;
                  color: #374151;
                  min-width: 20px;
                  text-align: center;
                ">${key}</kbd>
              `
								)
								.join("")}
            </div>
          </div>
        `;
			});

			html += "</div></div>";
		});

		html += `
        <div style="
          text-align: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        ">
          按 F1 再次显示此帮助，按 Esc 或点击外部区域关闭
        </div>
      </div>
    `;

		return html;
	}

	/**
	 * 清理资源
	 */
	cleanup(): void {
		this.disable();
		this.shortcuts.clear();
	}
}

// 默认导出单例实例
export const keyboardShortcuts = new KeyboardShortcutManager();
