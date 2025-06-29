export type BrowserType = "chrome" | "firefox" | "edge" | "safari" | "other";

// 定义DisplayMediaStreamConstraints类型（如果浏览器类型库中没有）
export interface DisplayMediaStreamConstraints {
	video?: boolean | MediaTrackConstraints;
	audio?: boolean | MediaTrackConstraints;
}

export interface BrowserCapabilities {
	supportsGetDisplayMedia: boolean;
	supportsMediaRecorder: boolean;
	supportsWebP: boolean;
	supportsIndexedDB: boolean;
	supportsOffscreenCanvas: boolean;
	supportsWebGL: boolean;
	supportedVideoCodecs: string[];
	supportedAudioCodecs: string[];
	maxStorageQuota: number;
	screenCaptureAPI: "getDisplayMedia" | "legacy" | "none";
}

export interface BrowserInfo {
	type: BrowserType;
	version: string;
	capabilities: BrowserCapabilities;
	userAgent: string;
}

export class BrowserCompat {
	private static instance: BrowserCompat;
	private browserInfo: BrowserInfo;
	private capabilities: BrowserCapabilities;

	private constructor() {
		this.browserInfo = this.detectBrowser();
		this.capabilities = this.detectCapabilities();
	}

	/**
	 * 获取单例实例
	 */
	static getInstance(): BrowserCompat {
		if (!BrowserCompat.instance) {
			BrowserCompat.instance = new BrowserCompat();
		}
		return BrowserCompat.instance;
	}

	/**
	 * 检测浏览器类型和版本
	 */
	private detectBrowser(): BrowserInfo {
		const userAgent = navigator.userAgent;
		let type: BrowserType = "other";
		let version = "unknown";

		if (userAgent.includes("Firefox")) {
			type = "firefox";
			const match = userAgent.match(/Firefox\/(\d+\.?\d*)/);
			if (match) version = match[1];
		} else if (userAgent.includes("Chrome") && !userAgent.includes("Edge")) {
			type = "chrome";
			const match = userAgent.match(/Chrome\/(\d+\.?\d*)/);
			if (match) version = match[1];
		} else if (userAgent.includes("Edge")) {
			type = "edge";
			const match = userAgent.match(/Edge\/(\d+\.?\d*)/);
			if (match) version = match[1];
		} else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
			type = "safari";
			const match = userAgent.match(/Version\/(\d+\.?\d*)/);
			if (match) version = match[1];
		}

		return {
			type,
			version,
			userAgent,
			capabilities: this.detectCapabilities(),
		};
	}

	/**
	 * 检测浏览器能力
	 */
	private detectCapabilities(): BrowserCapabilities {
		return {
			supportsGetDisplayMedia: this.checkGetDisplayMediaSupport(),
			supportsMediaRecorder: this.checkMediaRecorderSupport(),
			supportsWebP: this.checkWebPSupport(),
			supportsIndexedDB: this.checkIndexedDBSupport(),
			supportsOffscreenCanvas: this.checkOffscreenCanvasSupport(),
			supportsWebGL: this.checkWebGLSupport(),
			supportedVideoCodecs: this.getSupportedVideoCodecs(),
			supportedAudioCodecs: this.getSupportedAudioCodecs(),
			maxStorageQuota: this.estimateStorageQuota(),
			screenCaptureAPI: this.getScreenCaptureAPI(),
		};
	}

	/**
	 * 获取浏览器信息
	 */
	getBrowserInfo(): BrowserInfo {
		return this.browserInfo;
	}

	/**
	 * 获取浏览器类型
	 */
	getBrowserType(): BrowserType {
		return this.browserInfo.type;
	}

	/**
	 * 获取浏览器版本
	 */
	getBrowserVersion(): string {
		return this.browserInfo.version;
	}

	/**
	 * 获取浏览器能力
	 */
	getCapabilities(): BrowserCapabilities {
		return this.capabilities;
	}

	/**
	 * 检查特定功能是否支持
	 */
	isFeatureSupported(feature: keyof BrowserCapabilities): boolean {
		return this.capabilities[feature] as boolean;
	}

	/**
	 * 获取浏览器API对象
	 */
	getBrowserAPI(): any {
		// @ts-ignore
		if (typeof chrome !== "undefined" && chrome.runtime) {
			// @ts-ignore
			return chrome;
		}
		// @ts-ignore
		if (typeof browser !== "undefined") {
			// @ts-ignore
			return browser;
		}
		throw new Error("Browser extension API not available");
	}

	/**
	 * 发送消息到后台脚本（兼容不同浏览器）
	 */
	async sendMessage(message: any): Promise<any> {
		const browserAPI = this.getBrowserAPI();

		return new Promise((resolve, reject) => {
			if (this.browserInfo.type === "firefox") {
				// Firefox使用Promise-based API
				browserAPI.runtime.sendMessage(message).then(resolve).catch(reject);
			} else {
				// Chrome使用回调API
				browserAPI.runtime.sendMessage(message, (response: any) => {
					if (browserAPI.runtime.lastError) {
						reject(new Error(browserAPI.runtime.lastError.message));
					} else {
						resolve(response);
					}
				});
			}
		});
	}

	/**
	 * 获取支持的MIME类型
	 */
	getSupportedMimeTypes(): string[] {
		if (!this.capabilities.supportsMediaRecorder) {
			return [];
		}

		const types = [
			"video/webm;codecs=vp9,opus",
			"video/webm;codecs=vp8,opus",
			"video/webm;codecs=h264,opus",
			"video/webm;codecs=vp9",
			"video/webm;codecs=vp8",
			"video/webm",
			"video/mp4;codecs=h264,aac",
			"video/mp4",
		];

		return types.filter((type) => {
			try {
				return MediaRecorder.isTypeSupported(type);
			} catch (e) {
				return false;
			}
		});
	}

	/**
	 * 获取最佳MIME类型
	 */
	getBestMimeType(): string {
		const supported = this.getSupportedMimeTypes();

		// 优先级顺序
		const priorities = [
			"video/webm;codecs=vp9,opus",
			"video/webm;codecs=vp8,opus",
			"video/webm;codecs=h264,opus",
			"video/webm",
			"video/mp4",
		];

		for (const type of priorities) {
			if (supported.includes(type)) {
				return type;
			}
		}

		return supported[0] || "video/webm";
	}

	/**
	 * 获取屏幕捕获方法
	 */
	async getDisplayMedia(
		constraints?: DisplayMediaStreamConstraints
	): Promise<MediaStream> {
		if (!this.capabilities.supportsGetDisplayMedia) {
			throw new Error("Screen capture is not supported in this browser");
		}

		try {
			// 使用标准API
			return await navigator.mediaDevices.getDisplayMedia(constraints);
		} catch (error) {
			// 浏览器特定的错误处理
			if (this.browserInfo.type === "firefox") {
				// Firefox特定的错误处理
				if (error instanceof Error && error.name === "NotAllowedError") {
					throw new Error(
						"Screen sharing permission denied. Please allow screen sharing in Firefox settings."
					);
				}
			} else if (this.browserInfo.type === "chrome") {
				// Chrome特定的错误处理
				if (error instanceof Error && error.name === "NotAllowedError") {
					throw new Error(
						"Screen sharing permission denied. Please allow screen sharing in Chrome."
					);
				}
			}
			throw error;
		}
	}

	/**
	 * 获取推荐的录制配置
	 */
	getRecommendedRecordingOptions(): {
		mimeType: string;
		videoBitsPerSecond: number;
		audioBitsPerSecond: number;
		frameRate: number;
	} {
		const mimeType = this.getBestMimeType();
		let videoBitsPerSecond = 2500000; // 2.5 Mbps default
		let audioBitsPerSecond = 128000; // 128 kbps default
		let frameRate = 30;

		// 根据浏览器和性能调整
		if (this.browserInfo.type === "firefox") {
			// Firefox在某些情况下性能较低
			videoBitsPerSecond = 2000000; // 2 Mbps
			frameRate = 24;
		} else if (this.browserInfo.type === "safari") {
			// Safari的兼容性限制
			videoBitsPerSecond = 1500000; // 1.5 Mbps
			frameRate = 24;
		}

		return {
			mimeType,
			videoBitsPerSecond,
			audioBitsPerSecond,
			frameRate,
		};
	}

	/**
	 * 检查getDisplayMedia支持
	 */
	private checkGetDisplayMediaSupport(): boolean {
		return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
	}

	/**
	 * 检查MediaRecorder支持
	 */
	private checkMediaRecorderSupport(): boolean {
		return typeof MediaRecorder !== "undefined";
	}

	/**
	 * 检查WebP支持
	 */
	private checkWebPSupport(): boolean {
		try {
			const canvas = document.createElement("canvas");
			canvas.width = 1;
			canvas.height = 1;
			const dataURL = canvas.toDataURL("image/webp");
			return dataURL.startsWith("data:image/webp");
		} catch (e) {
			return false;
		}
	}

	/**
	 * 检查IndexedDB支持
	 */
	private checkIndexedDBSupport(): boolean {
		return "indexedDB" in window && !!window.indexedDB;
	}

	/**
	 * 检查OffscreenCanvas支持
	 */
	private checkOffscreenCanvasSupport(): boolean {
		return typeof OffscreenCanvas !== "undefined";
	}

	/**
	 * 检查WebGL支持
	 */
	private checkWebGLSupport(): boolean {
		try {
			const canvas = document.createElement("canvas");
			return !!(
				canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
			);
		} catch (e) {
			return false;
		}
	}

	/**
	 * 获取支持的视频编解码器
	 */
	private getSupportedVideoCodecs(): string[] {
		if (!this.checkMediaRecorderSupport()) {
			return [];
		}

		const codecs = ["vp9", "vp8", "h264", "av1"];
		const supported: string[] = [];

		for (const codec of codecs) {
			try {
				if (MediaRecorder.isTypeSupported(`video/webm;codecs=${codec}`)) {
					supported.push(codec);
				}
			} catch (e) {
				// 忽略错误
			}
		}

		return supported;
	}

	/**
	 * 获取支持的音频编解码器
	 */
	private getSupportedAudioCodecs(): string[] {
		if (!this.checkMediaRecorderSupport()) {
			return [];
		}

		const codecs = ["opus", "vorbis", "aac", "mp3"];
		const supported: string[] = [];

		for (const codec of codecs) {
			try {
				if (
					MediaRecorder.isTypeSupported(`audio/webm;codecs=${codec}`) ||
					MediaRecorder.isTypeSupported(`audio/mp4;codecs=${codec}`)
				) {
					supported.push(codec);
				}
			} catch (e) {
				// 忽略错误
			}
		}

		return supported;
	}

	/**
	 * 估算存储配额
	 */
	private estimateStorageQuota(): number {
		// 默认值（以字节为单位）
		let defaultQuota = 100 * 1024 * 1024; // 100MB

		if (this.browserInfo.type === "chrome") {
			defaultQuota = 200 * 1024 * 1024; // Chrome通常有更高的配额
		} else if (this.browserInfo.type === "firefox") {
			defaultQuota = 150 * 1024 * 1024; // Firefox中等配额
		} else if (this.browserInfo.type === "safari") {
			defaultQuota = 50 * 1024 * 1024; // Safari较低配额
		}

		return defaultQuota;
	}

	/**
	 * 获取屏幕捕获API类型
	 */
	private getScreenCaptureAPI(): "getDisplayMedia" | "legacy" | "none" {
		if (this.checkGetDisplayMediaSupport()) {
			return "getDisplayMedia";
		}
		// 检查是否有旧版API（这里简化处理）
		return "none";
	}

	/**
	 * 获取浏览器特定的CSS前缀
	 */
	getCSSPrefix(): string {
		switch (this.browserInfo.type) {
			case "firefox":
				return "-moz-";
			case "chrome":
			case "edge":
				return "-webkit-";
			case "safari":
				return "-webkit-";
			default:
				return "";
		}
	}

	/**
	 * 获取浏览器特定的样式
	 */
	getBrowserSpecificStyles(): Record<string, string> {
		const prefix = this.getCSSPrefix();

		return {
			userSelect: `${prefix}user-select`,
			transform: `${prefix}transform`,
			transition: `${prefix}transition`,
			borderRadius: `${prefix}border-radius`,
			boxShadow: `${prefix}box-shadow`,
		};
	}

	/**
	 * 创建兼容的事件监听器
	 */
	addEventListener(
		element: Element,
		event: string,
		handler: EventListener,
		options?: AddEventListenerOptions
	): void {
		// 处理浏览器特定的事件名称
		const eventMap: Record<string, Record<string, string>> = {
			firefox: {
				wheel: "DOMMouseScroll",
			},
		};

		const browserSpecificEvent =
			eventMap[this.browserInfo.type]?.[event] || event;
		element.addEventListener(browserSpecificEvent, handler, options);
	}

	/**
	 * 生成详细的兼容性报告
	 */
	generateCompatibilityReport(): string {
		const caps = this.capabilities;
		const info = this.browserInfo;

		return `
Browser Compatibility Report
============================
Browser: ${info.type} ${info.version}
User Agent: ${info.userAgent}

Core Features:
- Screen Capture API: ${caps.screenCaptureAPI}
- MediaRecorder: ${caps.supportsMediaRecorder ? "✓" : "✗"}
- getDisplayMedia: ${caps.supportsGetDisplayMedia ? "✓" : "✗"}
- IndexedDB: ${caps.supportsIndexedDB ? "✓" : "✗"}
- OffscreenCanvas: ${caps.supportsOffscreenCanvas ? "✓" : "✗"}
- WebGL: ${caps.supportsWebGL ? "✓" : "✗"}
- WebP: ${caps.supportsWebP ? "✓" : "✗"}

Media Support:
- Supported Video Codecs: ${caps.supportedVideoCodecs.join(", ") || "None"}
- Supported Audio Codecs: ${caps.supportedAudioCodecs.join(", ") || "None"}
- Best MIME Type: ${this.getBestMimeType()}

Storage:
- Estimated Quota: ${(caps.maxStorageQuota / 1024 / 1024).toFixed(0)}MB

Recommended Settings:
${JSON.stringify(this.getRecommendedRecordingOptions(), null, 2)}
    `.trim();
	}
}

// 导出单例实例
export const browserCompat = BrowserCompat.getInstance();

// 便捷函数
export function getBrowserType(): BrowserType {
	return browserCompat.getBrowserType();
}

export function isFeatureSupported(
	feature: keyof BrowserCapabilities
): boolean {
	return browserCompat.isFeatureSupported(feature);
}

export function getBestMimeType(): string {
	return browserCompat.getBestMimeType();
}

export function sendMessage(message: any): Promise<any> {
	return browserCompat.sendMessage(message);
}

export function getDisplayMedia(
	constraints?: DisplayMediaStreamConstraints
): Promise<MediaStream> {
	return browserCompat.getDisplayMedia(constraints);
}
