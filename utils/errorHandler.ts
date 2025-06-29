// Element Plus 组件将根据环境动态使用

export interface RecoveryData {
	timestamp: number;
	recordingState?: {
		isRecording: boolean;
		startTime: number;
		settings: any;
		chunks: any[];
	};
	userPreferences?: any;
	drawingState?: {
		tool: string;
		color: string;
		brushSize: number;
		history: any[];
	};
}

export interface ErrorAction {
	text: string;
	action: () => void;
	type?: "primary" | "success" | "warning" | "danger";
}

export interface ErrorNotificationOptions {
	title?: string;
	message: string;
	type?: "error" | "warning" | "info";
	duration?: number;
	actions?: ErrorAction[];
	showStack?: boolean;
}

export class ErrorHandler {
	private static instance: ErrorHandler;
	private recoveryData: RecoveryData | null = null;
	private lastAction: (() => void) | null = null;
	private isInitialized = false;
	private errorHistory: Array<{
		error: Error;
		timestamp: number;
		context: string;
	}> = [];

	/**
	 * 检查是否在扩展环境中
	 */
	private isExtensionEnvironment(): boolean {
		return typeof browser !== "undefined" && !!browser.storage;
	}

	/**
	 * 通用存储方法
	 */
	private async setStorage(key: string, value: any): Promise<void> {
		try {
			if (this.isExtensionEnvironment()) {
				await browser.storage.local.set({ [key]: value });
			} else if (typeof localStorage !== "undefined") {
				localStorage.setItem(key, JSON.stringify(value));
			}
		} catch (error) {
			console.error("Failed to save to storage:", error);
		}
	}

	/**
	 * 通用获取方法
	 */
	private async getStorage(key: string): Promise<any> {
		try {
			if (this.isExtensionEnvironment()) {
				const result = await browser.storage.local.get(key);
				return result[key];
			} else if (typeof localStorage !== "undefined") {
				const value = localStorage.getItem(key);
				return value ? JSON.parse(value) : null;
			}
		} catch (error) {
			console.error("Failed to read from storage:", error);
		}
		return null;
	}

	/**
	 * 通用删除方法
	 */
	private async removeStorage(key: string): Promise<void> {
		try {
			if (this.isExtensionEnvironment()) {
				await browser.storage.local.remove(key);
			} else if (typeof localStorage !== "undefined") {
				localStorage.removeItem(key);
			}
		} catch (error) {
			console.error("Failed to remove from storage:", error);
		}
	}

	/**
	 * 获取存储中的所有键
	 */
	private async getAllStorageKeys(): Promise<string[]> {
		try {
			if (this.isExtensionEnvironment()) {
				const result = await browser.storage.local.get();
				return Object.keys(result);
			} else if (typeof localStorage !== "undefined") {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key) keys.push(key);
				}
				return keys;
			}
		} catch (error) {
			console.error("Failed to get storage keys:", error);
		}
		return [];
	}

	/**
	 * 安全显示通知
	 */
	private showNotification(options: {
		title?: string;
		message: string;
		type?: "success" | "warning" | "info" | "error";
		duration?: number;
	}): void {
		try {
			// 尝试使用 Element Plus
			if (typeof window !== "undefined" && (window as any).ElNotification) {
				(window as any).ElNotification(options);
			} else {
				// Fallback 到控制台
				console.log(
					`[${options.type?.toUpperCase() || "INFO"}] ${options.title}: ${
						options.message
					}`
				);
			}
		} catch (error) {
			console.log(
				`[${options.type?.toUpperCase() || "INFO"}] ${options.title}: ${
					options.message
				}`
			);
		}
	}

	/**
	 * 安全显示确认对话框
	 */
	private async showConfirm(options: {
		title?: string;
		message: string;
		confirmButtonText?: string;
		type?: "success" | "warning" | "info" | "error";
	}): Promise<boolean> {
		try {
			// 尝试使用 Element Plus
			if (typeof window !== "undefined" && (window as any).ElMessageBox) {
				await (window as any).ElMessageBox.confirm(
					options.message,
					options.title || "确认",
					{
						confirmButtonText: options.confirmButtonText || "确定",
						type: options.type || "warning",
						showCancelButton: false,
					}
				);
				return true;
			} else {
				// Fallback 到控制台
				console.log(`[CONFIRM] ${options.title}: ${options.message}`);
				return true;
			}
		} catch (error) {
			console.log(`[CONFIRM] ${options.title}: ${options.message}`);
			return false;
		}
	}

	private constructor() {
		this.initialize();
	}

	/**
	 * 获取单例实例
	 */
	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	/**
	 * 初始化错误处理器
	 */
	private initialize(): void {
		if (this.isInitialized) return;

		this.setupGlobalHandlers();
		this.loadRecoveryData().catch((error) => {
			console.error(
				"Failed to load recovery data during initialization:",
				error
			);
		});
		this.isInitialized = true;

		console.log("ErrorHandler initialized");
	}

	/**
	 * 设置全局错误处理器
	 */
	private setupGlobalHandlers(): void {
		// 处理未捕获的异常
		window.addEventListener("error", (event) => {
			this.handleGlobalError(event.error, "window.error", {
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
			});
		});

		// 处理未处理的Promise拒绝
		window.addEventListener("unhandledrejection", (event) => {
			this.handleGlobalError(
				new Error(event.reason?.message || "Unhandled Promise rejection"),
				"unhandled.rejection",
				{ reason: event.reason }
			);
			event.preventDefault(); // 阻止默认行为
		});

		// 页面卸载前保存状态
		window.addEventListener("beforeunload", () => {
			this.saveRecoveryData().catch((error) => {
				console.error("Failed to save recovery data on beforeunload:", error);
			});
		});

		// 页面隐藏时保存状态
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				this.saveRecoveryData().catch((error) => {
					console.error(
						"Failed to save recovery data on visibility change:",
						error
					);
				});
			}
		});
	}

	/**
	 * 处理错误（公共方法）
	 */
	handleError(error: Error, context: string, details?: any): void {
		this.handleGlobalError(error, context, details);
	}

	/**
	 * 处理全局错误
	 */
	private handleGlobalError(
		error: Error,
		context: string,
		details?: any
	): void {
		console.error(`Global error [${context}]:`, error, details);

		// 添加到错误历史
		this.errorHistory.push({
			error,
			timestamp: Date.now(),
			context,
		});

		// 保存恢复数据
		this.saveRecoveryData().catch((error) => {
			console.error("Failed to save recovery data on error:", error);
		});

		// 显示错误通知
		this.showErrorNotification({
			title: "发生错误",
			message: error.message || "未知错误",
			type: "error",
			actions: [
				{
					text: "重试",
					action: () => this.retryLastAction(),
					type: "primary",
				},
				{
					text: "报告问题",
					action: () => this.reportError(error, context, details),
					type: "warning",
				},
			],
		});
	}

	/**
	 * 处理权限错误
	 */
	handlePermissionError(error: Error, context: string = "permission"): void {
		console.error("Permission error:", error);

		this.showErrorNotification({
			title: "权限被拒绝",
			message: "需要屏幕录制权限才能正常工作。请在浏览器设置中允许相关权限。",
			type: "warning",
			duration: 0, // 不自动关闭
			actions: [
				{
					text: "查看帮助",
					action: () => this.showPermissionHelp(),
					type: "primary",
				},
				{
					text: "重试",
					action: () => this.retryLastAction(),
					type: "success",
				},
			],
		});
	}

	/**
	 * 处理存储错误
	 */
	handleStorageError(error: Error, context: string = "storage"): void {
		console.error("Storage error:", error);

		if (error.name === "QuotaExceededError") {
			this.handleQuotaExceededError();
		} else if (error.name === "InvalidStateError") {
			this.handleInvalidStateError();
		} else {
			this.showErrorNotification({
				title: "存储错误",
				message: `存储操作失败：${error.message}`,
				type: "error",
				actions: [
					{
						text: "清理缓存",
						action: () => this.clearCache(),
						type: "warning",
					},
					{
						text: "重试",
						action: () => this.retryLastAction(),
						type: "primary",
					},
				],
			});
		}
	}

	/**
	 * 处理配额超出错误
	 */
	private handleQuotaExceededError(): void {
		this.showErrorNotification({
			title: "存储空间不足",
			message: "浏览器存储空间已满，无法继续录制。请清理数据或降低录制质量。",
			type: "warning",
			duration: 0,
			actions: [
				{
					text: "降低质量",
					action: () => this.reduceRecordingQuality(),
					type: "primary",
				},
				{
					text: "清理旧录制",
					action: () => this.clearOldRecordings(),
					type: "warning",
				},
				{
					text: "继续录制",
					action: () => this.retryLastAction(),
					type: "success",
				},
			],
		});
	}

	/**
	 * 处理无效状态错误
	 */
	private handleInvalidStateError(): void {
		this.showErrorNotification({
			title: "状态错误",
			message: "录制器处于无效状态。将尝试重置。",
			type: "warning",
			actions: [
				{
					text: "重置录制器",
					action: () => this.resetRecorder(),
					type: "primary",
				},
			],
		});
	}

	/**
	 * 处理网络错误
	 */
	handleNetworkError(error: Error, context: string = "network"): void {
		console.error("Network error:", error);

		this.showErrorNotification({
			title: "网络错误",
			message: "网络连接出现问题，某些功能可能无法使用。",
			type: "warning",
			actions: [
				{
					text: "检查连接",
					action: () => this.checkNetworkConnection(),
					type: "primary",
				},
				{
					text: "离线模式",
					action: () => this.enableOfflineMode(),
					type: "warning",
				},
			],
		});
	}

	/**
	 * 设置恢复数据
	 */
	setRecoveryData(data: Partial<RecoveryData>): void {
		this.recoveryData = {
			timestamp: Date.now(),
			...this.recoveryData,
			...data,
		};
		this.saveRecoveryData();
	}

	/**
	 * 保存恢复数据到存储
	 */
	async saveRecoveryData(): Promise<void> {
		if (!this.recoveryData) return;

		try {
			const dataToSave = {
				...this.recoveryData,
				timestamp: Date.now(),
			};

			await this.setStorage("screenRecorderRecoveryData", dataToSave);
			console.log("Recovery data saved");
		} catch (error) {
			console.error("Failed to save recovery data:", error);
		}
	}

	/**
	 * 加载恢复数据
	 */
	private async loadRecoveryData(): Promise<void> {
		try {
			const savedData = await this.getStorage("screenRecorderRecoveryData");
			if (!savedData) return;

			// 检查数据是否过期（超过1小时）
			if (Date.now() - savedData.timestamp > 60 * 60 * 1000) {
				await this.clearRecoveryData();
				return;
			}

			this.recoveryData = savedData;
			console.log("Recovery data loaded");
		} catch (error) {
			console.error("Failed to load recovery data:", error);
			await this.clearRecoveryData();
		}
	}

	/**
	 * 检查是否有恢复数据
	 */
	hasRecoveryData(): boolean {
		return !!this.recoveryData;
	}

	/**
	 * 获取恢复数据
	 */
	getRecoveryData(): RecoveryData | null {
		return this.recoveryData;
	}

	/**
	 * 清除恢复数据
	 */
	async clearRecoveryData(): Promise<void> {
		this.recoveryData = null;
		try {
			await this.removeStorage("screenRecorderRecoveryData");
			console.log("Recovery data cleared");
		} catch (error) {
			console.error("Failed to clear recovery data:", error);
		}
	}

	/**
	 * 设置最后执行的操作
	 */
	setLastAction(action: () => void): void {
		this.lastAction = action;
	}

	/**
	 * 重试最后的操作
	 */
	private retryLastAction(): void {
		if (this.lastAction) {
			try {
				console.log("Retrying last action");
				this.lastAction();
			} catch (error) {
				console.error("Failed to retry last action:", error);
				this.handleGlobalError(error as Error, "retry.action");
			}
		} else {
			ElNotification({
				title: "无法重试",
				message: "没有可重试的操作",
				type: "info",
			});
		}
	}

	/**
	 * 显示错误通知
	 */
	private showErrorNotification(options: ErrorNotificationOptions): void {
		const notification = ElNotification({
			title: options.title || "错误",
			message: options.message,
			type: options.type || "error",
			duration: options.duration !== undefined ? options.duration : 5000,
			showClose: true,
			dangerouslyUseHTMLString: false,
		});

		// 如果有操作按钮，使用MessageBox代替
		if (options.actions && options.actions.length > 0) {
			notification.close();

			this.showErrorDialog(options);
		}
	}

	/**
	 * 显示错误对话框
	 */
	private async showErrorDialog(
		options: ErrorNotificationOptions
	): Promise<void> {
		try {
			if (options.actions && options.actions.length === 1) {
				// 单个按钮的简单确认框
				await ElMessageBox.confirm(options.message, options.title || "错误", {
					confirmButtonText: options.actions[0].text,
					type: options.type === "warning" ? "warning" : "error",
					showCancelButton: false,
				});

				options.actions[0].action();
			} else if (options.actions && options.actions.length > 1) {
				// 多个按钮的选择框
				const buttons = options.actions.map((action) => action.text).join("|");

				const { value } = await ElMessageBox.prompt(
					options.message,
					options.title || "错误",
					{
						confirmButtonText: "确定",
						cancelButtonText: "取消",
						inputType: "textarea",
						inputValue: buttons,
						showInput: false,
						type: options.type === "warning" ? "warning" : "error",
					}
				);

				// 这里简化处理，实际应该创建自定义对话框
				if (options.actions[0]) {
					options.actions[0].action();
				}
			}
		} catch (error) {
			// 用户取消或其他错误
			console.log("Error dialog cancelled or failed:", error);
		}
	}

	/**
	 * 显示权限帮助
	 */
	private showPermissionHelp(): void {
		ElMessageBox.alert(
			"请按以下步骤允许屏幕录制权限：\n\n" +
				"1. 点击地址栏左侧的锁形图标\n" +
				'2. 找到"摄像头"或"屏幕分享"选项\n' +
				'3. 选择"允许"\n' +
				"4. 刷新页面重试\n\n" +
				"如果仍然有问题，请尝试重启浏览器。",
			"权限设置帮助",
			{
				confirmButtonText: "我知道了",
				type: "info",
			}
		);
	}

	/**
	 * 报告错误
	 */
	private reportError(error: Error, context: string, details?: any): void {
		const errorReport = {
			message: error.message,
			stack: error.stack,
			context,
			details,
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			url: window.location.href,
		};

		console.log("Error report:", errorReport);

		// 这里可以发送到错误追踪服务
		ElNotification({
			title: "错误已记录",
			message: "错误信息已保存，感谢您的反馈！",
			type: "success",
		});
	}

	/**
	 * 降低录制质量
	 */
	private reduceRecordingQuality(): void {
		console.log("Reducing recording quality");

		// 触发质量降低事件
		window.dispatchEvent(new CustomEvent("recording-quality-reduce"));

		ElNotification({
			title: "质量已调整",
			message: "录制质量已降低以节省存储空间",
			type: "success",
		});
	}

	/**
	 * 清理旧录制
	 */
	private clearOldRecordings(): void {
		console.log("Clearing old recordings");

		// 触发清理事件
		window.dispatchEvent(new CustomEvent("recording-cleanup"));

		ElNotification({
			title: "清理完成",
			message: "旧录制文件已清理",
			type: "success",
		});
	}

	/**
	 * 清理缓存
	 */
	private async clearCache(): Promise<void> {
		try {
			// 获取所有存储键
			const allKeys = await this.getAllStorageKeys();
			const keysToRemove = allKeys.filter(
				(key) => key.startsWith("recording_") || key.startsWith("screen_")
			);

			// 删除匹配的键
			for (const key of keysToRemove) {
				await this.removeStorage(key);
			}

			if (typeof ElNotification !== "undefined") {
				ElNotification({
					title: "缓存已清理",
					message: "录制相关缓存已清理完成",
					type: "success",
				});
			} else {
				console.log("Cache cleared: removed", keysToRemove.length, "items");
			}
		} catch (error) {
			console.error("Failed to clear cache:", error);
		}
	}

	/**
	 * 重置录制器
	 */
	private resetRecorder(): void {
		console.log("Resetting recorder");

		// 触发重置事件
		window.dispatchEvent(new CustomEvent("recording-reset"));

		ElNotification({
			title: "录制器已重置",
			message: "录制器状态已重置，请重新开始录制",
			type: "success",
		});
	}

	/**
	 * 检查网络连接
	 */
	private checkNetworkConnection(): void {
		if (navigator.onLine) {
			ElNotification({
				title: "网络正常",
				message: "网络连接正常",
				type: "success",
			});
		} else {
			ElNotification({
				title: "网络断开",
				message: "当前网络连接断开，请检查网络设置",
				type: "error",
			});
		}
	}

	/**
	 * 启用离线模式
	 */
	private enableOfflineMode(): void {
		console.log("Enabling offline mode");

		// 触发离线模式事件
		window.dispatchEvent(new CustomEvent("recording-offline-mode"));

		ElNotification({
			title: "离线模式",
			message: "已切换到离线模式，某些功能可能受限",
			type: "warning",
		});
	}

	/**
	 * 获取错误历史
	 */
	getErrorHistory(): Array<{
		error: Error;
		timestamp: number;
		context: string;
	}> {
		return [...this.errorHistory];
	}

	/**
	 * 清除错误历史
	 */
	clearErrorHistory(): void {
		this.errorHistory = [];
	}

	/**
	 * 销毁错误处理器
	 */
	destroy(): void {
		this.saveRecoveryData().catch((error) => {
			console.error("Failed to save recovery data on destroy:", error);
		});
		this.isInitialized = false;
		console.log("ErrorHandler destroyed");
	}
}

// 默认导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 便捷函数
export function handleError(error: Error, context: string = "unknown"): void {
	errorHandler.handleError(error, context);
}

export function handlePermissionError(error: Error): void {
	errorHandler.handlePermissionError(error);
}

export function handleStorageError(error: Error): void {
	errorHandler.handleStorageError(error);
}

export function handleNetworkError(error: Error): void {
	errorHandler.handleNetworkError(error);
}

export function setLastAction(action: () => void): void {
	errorHandler.setLastAction(action);
}

export function setRecoveryData(data: Partial<RecoveryData>): void {
	errorHandler.setRecoveryData(data);
}
