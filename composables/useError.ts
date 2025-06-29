// Note: Vue types need to be available in the project
import { ref, computed } from "vue";
import { ErrorHandler } from "../utils/errorHandler";

// 错误类型
export type ErrorType =
	| "permission"
	| "storage"
	| "network"
	| "recording"
	| "conversion"
	| "general";

// 错误级别
export type ErrorLevel = "info" | "warning" | "error" | "critical";

// 错误信息接口
export interface ErrorInfo {
	id: string;
	type: ErrorType;
	level: ErrorLevel;
	message: string;
	details?: string;
	timestamp: number;
	dismissed: boolean;
	recoveryAction?: string;
}

// 恢复建议接口
export interface RecoveryAction {
	label: string;
	action: () => void | Promise<void>;
	autoExecute?: boolean;
}

export interface UseErrorReturn {
	// 状态
	errors: any; // ref<ErrorInfo[]>
	currentError: any; // ref<ErrorInfo | null>
	hasErrors: any; // computed<boolean>
	criticalErrors: any; // computed<ErrorInfo[]>

	// 方法
	addError: (
		type: ErrorType,
		message: string,
		level?: ErrorLevel,
		details?: string
	) => string;
	dismissError: (errorId: string) => void;
	dismissAllErrors: () => void;
	clearErrors: () => void;
	getErrorById: (errorId: string) => ErrorInfo | undefined;
	getErrorsByType: (type: ErrorType) => ErrorInfo[];
	showErrorNotification: (error: ErrorInfo) => void;
	handleRecovery: (errorId: string) => Promise<boolean>;
}

export function useError(): UseErrorReturn {
	// 状态管理
	const errors = ref<ErrorInfo[]>([]);
	const currentError = ref<ErrorInfo | null>(null);

	// 错误处理器实例
	const errorHandler = ErrorHandler.getInstance();

	// 计算属性
	const hasErrors = computed(() => errors.value.length > 0);

	const criticalErrors = computed(() =>
		errors.value.filter(
			(error) => error.level === "critical" && !error.dismissed
		)
	);

	// 添加错误
	function addError(
		type: ErrorType,
		message: string,
		level: ErrorLevel = "error",
		details?: string
	): string {
		const errorId = generateErrorId();

		const errorInfo: ErrorInfo = {
			id: errorId,
			type,
			level,
			message,
			details,
			timestamp: Date.now(),
			dismissed: false,
			recoveryAction: getRecoveryAction(type),
		};

		errors.value.push(errorInfo);

		// 设置当前错误（如果是关键错误）
		if (level === "critical") {
			currentError.value = errorInfo;
		}

		// 显示错误通知
		showErrorNotification(errorInfo);

		// 记录到错误处理器
		const error = new Error(message);
		error.name = `${type.toUpperCase()}_ERROR`;
		errorHandler.handleError(error, { type, level, details });

		return errorId;
	}

	// 解除错误
	function dismissError(errorId: string): void {
		const errorIndex = errors.value.findIndex((error) => error.id === errorId);
		if (errorIndex >= 0) {
			errors.value[errorIndex].dismissed = true;

			// 如果是当前错误，清除当前错误
			if (currentError.value?.id === errorId) {
				currentError.value = null;
			}
		}
	}

	// 解除所有错误
	function dismissAllErrors(): void {
		errors.value.forEach((error) => {
			error.dismissed = true;
		});
		currentError.value = null;
	}

	// 清除所有错误
	function clearErrors(): void {
		errors.value = [];
		currentError.value = null;
	}

	// 根据ID获取错误
	function getErrorById(errorId: string): ErrorInfo | undefined {
		return errors.value.find((error) => error.id === errorId);
	}

	// 根据类型获取错误
	function getErrorsByType(type: ErrorType): ErrorInfo[] {
		return errors.value.filter((error) => error.type === type);
	}

	// 显示错误通知
	function showErrorNotification(error: ErrorInfo): void {
		// 根据错误级别决定通知方式
		switch (error.level) {
			case "info":
				console.info(`[${error.type.toUpperCase()}] ${error.message}`);
				break;
			case "warning":
				console.warn(`[${error.type.toUpperCase()}] ${error.message}`);
				break;
			case "error":
				console.error(
					`[${error.type.toUpperCase()}] ${error.message}`,
					error.details
				);
				break;
			case "critical":
				console.error(
					`[CRITICAL ${error.type.toUpperCase()}] ${error.message}`,
					error.details
				);
				// 对于关键错误，可以显示模态框或其他UI提示
				break;
		}

		// 如果有 Element Plus，可以使用 ElMessage 或 ElNotification
		// ElMessage({
		//   type: error.level === 'error' || error.level === 'critical' ? 'error' : 'warning',
		//   message: error.message,
		//   duration: error.level === 'critical' ? 0 : 5000
		// });
	}

	// 处理错误恢复
	async function handleRecovery(errorId: string): Promise<boolean> {
		const error = getErrorById(errorId);
		if (!error || !error.recoveryAction) {
			return false;
		}

		try {
			const recovery = getRecoveryActionHandler(error.type);
			if (recovery) {
				await recovery.action();
				dismissError(errorId);
				return true;
			}
		} catch (recoveryError) {
			console.error("Recovery failed:", recoveryError);
			addError(
				"general",
				"Recovery action failed",
				"error",
				recoveryError instanceof Error
					? recoveryError.message
					: "Unknown recovery error"
			);
		}

		return false;
	}

	// 生成错误ID
	function generateErrorId(): string {
		return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// 获取恢复操作建议
	function getRecoveryAction(type: ErrorType): string | undefined {
		const recoveryActions: Record<ErrorType, string> = {
			permission: "Grant required permissions",
			storage: "Clear browser storage or free up space",
			network: "Check internet connection and retry",
			recording: "Restart recording with different settings",
			conversion: "Try converting with lower quality settings",
			general: "Refresh the page and try again",
		};

		return recoveryActions[type];
	}

	// 获取恢复操作处理器
	function getRecoveryActionHandler(type: ErrorType): RecoveryAction | null {
		switch (type) {
			case "permission":
				return {
					label: "Request Permissions",
					action: async () => {
						// 重新请求权限
						if (navigator.mediaDevices?.getDisplayMedia) {
							try {
								await navigator.mediaDevices.getDisplayMedia({ video: true });
							} catch (e) {
								throw new Error("Permission denied by user");
							}
						}
					},
				};

			case "storage":
				return {
					label: "Clear Storage",
					action: async () => {
						// 清理存储
						if ("storage" in navigator && "estimate" in navigator.storage) {
							const estimate = await navigator.storage.estimate();
							console.log("Storage usage:", estimate);
						}

						// 清理缓存
						if ("caches" in window) {
							const cacheNames = await caches.keys();
							await Promise.all(cacheNames.map((name) => caches.delete(name)));
						}
					},
				};

			case "network":
				return {
					label: "Retry Connection",
					action: async () => {
						// 检查网络连接
						if (!navigator.onLine) {
							throw new Error("No internet connection");
						}

						// 简单的网络测试
						try {
							const response = await fetch("/favicon.ico", { method: "HEAD" });
							if (!response.ok) {
								throw new Error("Network connectivity test failed");
							}
						} catch (e) {
							throw new Error("Unable to reach server");
						}
					},
				};

			case "recording":
				return {
					label: "Reset Recording",
					action: async () => {
						// 重置录制状态
						// 这里应该调用录制服务的重置方法
						window.location.reload();
					},
				};

			case "conversion":
				return {
					label: "Retry Conversion",
					action: async () => {
						// 重试转换，使用更低的质量设置
						// 这里应该重新触发转换过程
						console.log("Retrying conversion with lower quality settings");
					},
				};

			default:
				return {
					label: "Refresh Page",
					action: async () => {
						window.location.reload();
					},
				};
		}
	}

	// 错误统计
	function getErrorStats() {
		const stats = {
			total: errors.value.length,
			byType: {} as Record<ErrorType, number>,
			byLevel: {} as Record<ErrorLevel, number>,
			dismissed: errors.value.filter((e) => e.dismissed).length,
			active: errors.value.filter((e) => !e.dismissed).length,
		};

		errors.value.forEach((error) => {
			stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
			stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
		});

		return stats;
	}

	// 错误报告
	function generateErrorReport(): string {
		const stats = getErrorStats();
		const activeErrors = errors.value.filter((e) => !e.dismissed);

		let report = `Error Report (${new Date().toISOString()})\n`;
		report += `Total Errors: ${stats.total}\n`;
		report += `Active Errors: ${stats.active}\n`;
		report += `Dismissed Errors: ${stats.dismissed}\n\n`;

		if (activeErrors.length > 0) {
			report += "Active Errors:\n";
			activeErrors.forEach((error) => {
				report += `- [${error.level.toUpperCase()}] ${error.type}: ${
					error.message
				}\n`;
				if (error.details) {
					report += `  Details: ${error.details}\n`;
				}
				report += `  Time: ${new Date(error.timestamp).toLocaleString()}\n\n`;
			});
		}

		return report;
	}

	return {
		// 状态
		errors,
		currentError,
		hasErrors,
		criticalErrors,

		// 方法
		addError,
		dismissError,
		dismissAllErrors,
		clearErrors,
		getErrorById,
		getErrorsByType,
		showErrorNotification,
		handleRecovery,
	};
}
