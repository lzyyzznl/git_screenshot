// Note: Vue types need to be available in the project
import { ref, computed, onMounted } from "vue";
import { BrowserCompat } from "../utils/browserCompat";

// 权限状态类型
export type PermissionStatus = "granted" | "denied" | "prompt" | "unknown";

// 浏览器特性支持状态
export interface BrowserSupport {
	getDisplayMedia: boolean;
	mediaRecorder: boolean;
	webp: boolean;
	indexedDB: boolean;
	offscreenCanvas: boolean;
	webGL: boolean;
}

// API兼容性信息
export interface ApiCompatibility {
	videoCodecs: string[];
	audioCodecs: string[];
	mimeTypes: string[];
	bestMimeType: string;
}

export interface UseBrowserReturn {
	// 状态
	browserType: any; // ref<string>
	browserVersion: any; // ref<string>
	isSupported: any; // ref<boolean>
	permissions: any; // ref<Record<string, PermissionStatus>>
	capabilities: any; // ref<BrowserSupport>

	// 计算属性
	isCompatible: any; // computed<boolean>
	supportedFeatures: any; // computed<string[]>
	missingFeatures: any; // computed<string[]>

	// 方法
	checkPermissions: () => Promise<void>;
	requestPermission: (name: string) => Promise<PermissionStatus>;
	sendMessage: (message: any) => Promise<any>;
	getApiCompatibility: () => ApiCompatibility;
	checkFeatureSupport: (feature: string) => boolean;
	generateCompatibilityReport: () => string;
}

export function useBrowser(): UseBrowserReturn {
	// 状态管理
	const browserType = ref<string>("unknown");
	const browserVersion = ref<string>("unknown");
	const isSupported = ref<boolean>(false);
	const permissions = ref<Record<string, PermissionStatus>>({});
	const capabilities = ref<BrowserSupport>({
		getDisplayMedia: false,
		mediaRecorder: false,
		webp: false,
		indexedDB: false,
		offscreenCanvas: false,
		webGL: false,
	});

	// 浏览器兼容性实例
	const browserCompat = BrowserCompat.getInstance();

	// 计算属性
	const isCompatible = computed(() => {
		const required = ["getDisplayMedia", "mediaRecorder"];
		return required.every(
			(feature) => capabilities.value[feature as keyof BrowserSupport]
		);
	});

	const supportedFeatures = computed(() => {
		return Object.entries(capabilities.value)
			.filter(([, supported]) => supported)
			.map(([feature]) => feature);
	});

	const missingFeatures = computed(() => {
		return Object.entries(capabilities.value)
			.filter(([, supported]) => !supported)
			.map(([feature]) => feature);
	});

	// 初始化浏览器信息
	function initializeBrowserInfo(): void {
		const info = browserCompat.getBrowserInfo();
		browserType.value = info.type;
		browserVersion.value = info.version;

		// 检查基本支持
		isSupported.value = isCompatible.value;

		// 更新能力信息
		const caps = browserCompat.getCapabilities();
		capabilities.value = {
			getDisplayMedia: caps.supportsGetDisplayMedia,
			mediaRecorder: caps.supportsMediaRecorder,
			webp: caps.supportsWebP,
			indexedDB: caps.supportsIndexedDB,
			offscreenCanvas: caps.supportsOffscreenCanvas,
			webGL: caps.supportsWebGL,
		};
	}

	// 检查权限状态
	async function checkPermissions(): Promise<void> {
		const permissionsToCheck = ["camera", "microphone", "display-capture"];

		for (const permission of permissionsToCheck) {
			try {
				const status = await getPermissionStatus(permission);
				permissions.value[permission] = status;
			} catch (error) {
				permissions.value[permission] = "unknown";
			}
		}
	}

	// 请求特定权限
	async function requestPermission(name: string): Promise<PermissionStatus> {
		try {
			let status: PermissionStatus = "unknown";

			switch (name) {
				case "camera":
				case "microphone":
					try {
						const stream = await navigator.mediaDevices.getUserMedia({
							video: name === "camera",
							audio: name === "microphone",
						});

						// 立即停止流
						stream.getTracks().forEach((track) => track.stop());
						status = "granted";
					} catch (error) {
						status = "denied";
					}
					break;

				case "display-capture":
					try {
						const stream = await navigator.mediaDevices.getDisplayMedia({
							video: true,
							audio: true,
						});

						// 立即停止流
						stream.getTracks().forEach((track) => track.stop());
						status = "granted";
					} catch (error) {
						status = "denied";
					}
					break;

				default:
					// 使用通用权限API
					if ("permissions" in navigator) {
						const result = await navigator.permissions.query({
							name: name as any,
						});
						status = result.state as PermissionStatus;
					}
			}

			permissions.value[name] = status;
			return status;
		} catch (error) {
			permissions.value[name] = "unknown";
			return "unknown";
		}
	}

	// 发送消息到后台脚本
	async function sendMessage(message: any): Promise<any> {
		try {
			return await browserCompat.sendMessage(message);
		} catch (error) {
			console.error("Failed to send message:", error);
			throw error;
		}
	}

	// 获取API兼容性信息
	function getApiCompatibility(): ApiCompatibility {
		const caps = browserCompat.getCapabilities();
		const mimeTypes = browserCompat.getSupportedMimeTypes();
		const bestMimeType = browserCompat.getBestMimeType();

		return {
			videoCodecs: caps.supportedVideoCodecs,
			audioCodecs: caps.supportedAudioCodecs,
			mimeTypes,
			bestMimeType,
		};
	}

	// 检查特性支持
	function checkFeatureSupport(feature: string): boolean {
		return browserCompat.isFeatureSupported(feature as any);
	}

	// 生成兼容性报告
	function generateCompatibilityReport(): string {
		return browserCompat.generateCompatibilityReport();
	}

	// 获取权限状态的辅助函数
	async function getPermissionStatus(
		permission: string
	): Promise<PermissionStatus> {
		if (!("permissions" in navigator)) {
			return "unknown";
		}

		try {
			const result = await navigator.permissions.query({
				name: permission as any,
			});
			return result.state as PermissionStatus;
		} catch (error) {
			// 某些权限可能不支持查询
			return "unknown";
		}
	}

	// 检查是否为安全上下文
	function isSecureContext(): boolean {
		return window.isSecureContext;
	}

	// 检查是否为本地主机
	function isLocalhost(): boolean {
		return (
			location.hostname === "localhost" ||
			location.hostname === "127.0.0.1" ||
			location.hostname === "[::1]"
		);
	}

	// 获取浏览器特定的建议
	function getBrowserSpecificAdvice(): string[] {
		const advice: string[] = [];
		const type = browserCompat.getBrowserType();

		switch (type) {
			case "chrome":
				advice.push(
					"Chrome provides the best support for screen recording APIs"
				);
				if (!isSecureContext() && !isLocalhost()) {
					advice.push("Use HTTPS for full functionality");
				}
				break;

			case "firefox":
				advice.push(
					"Firefox may require additional permissions for screen capture"
				);
				advice.push("Some video codecs may not be available");
				break;

			case "edge":
				advice.push("Edge has good compatibility with Chrome extensions");
				break;

			case "safari":
				advice.push("Safari has limited support for screen recording");
				advice.push("Consider using alternative recording methods");
				break;

			default:
				advice.push("This browser may not support all features");
				advice.push("Consider using Chrome or Firefox for best experience");
		}

		// 添加通用建议
		if (!capabilities.value.getDisplayMedia) {
			advice.push("Screen capture API is not supported");
		}

		if (!capabilities.value.mediaRecorder) {
			advice.push("Media recording API is not supported");
		}

		return advice;
	}

	// 获取推荐设置
	function getRecommendedSettings() {
		const settings = browserCompat.getRecommendedRecordingOptions();
		const compatibility = getApiCompatibility();

		return {
			recording: settings,
			mimeType: compatibility.bestMimeType,
			videoCodec: compatibility.videoCodecs[0] || "vp8",
			audioCodec: compatibility.audioCodecs[0] || "opus",
			advice: getBrowserSpecificAdvice(),
		};
	}

	// 检查更新支持
	function checkForUpdates(): string | null {
		const version = browserCompat.getBrowserVersion();
		const type = browserCompat.getBrowserType();

		// 这里可以添加版本检查逻辑
		// 返回更新建议
		return null;
	}

	// 组件挂载时初始化
	onMounted(() => {
		initializeBrowserInfo();
		checkPermissions();
	});

	return {
		// 状态
		browserType,
		browserVersion,
		isSupported,
		permissions,
		capabilities,

		// 计算属性
		isCompatible,
		supportedFeatures,
		missingFeatures,

		// 方法
		checkPermissions,
		requestPermission,
		sendMessage,
		getApiCompatibility,
		checkFeatureSupport,
		generateCompatibilityReport,
	};
}
