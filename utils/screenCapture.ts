import type { RecordingSettings } from "../types/recording";

// 屏幕捕获选项接口
export interface CaptureOptions {
	mode: "screen" | "tab" | "area";
	resolution: string;
	frameRate: number;
	withAudio: boolean;
	cursor?: boolean;
	echoCancellation?: boolean;
	noiseSuppression?: boolean;
}

// 捕获结果接口
export interface CaptureResult {
	stream: MediaStream;
	mode: "screen" | "tab" | "area";
	videoTrack: MediaStreamTrack | null;
	audioTrack: MediaStreamTrack | null;
	settings: {
		width: number;
		height: number;
		frameRate: number;
		hasAudio: boolean;
	};
}

// 错误类型
export class ScreenCaptureError extends Error {
	constructor(
		message: string,
		public code:
			| "PERMISSION_DENIED"
			| "NOT_SUPPORTED"
			| "CAPTURE_FAILED"
			| "UNKNOWN",
		public originalError?: Error
	) {
		super(message);
		this.name = "ScreenCaptureError";
	}
}

/**
 * 开始屏幕捕获
 * @param options 捕获选项
 * @returns 捕获结果
 */
export async function startCapture(
	options: CaptureOptions
): Promise<CaptureResult> {
	try {
		// 检查浏览器支持
		if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
			throw new ScreenCaptureError(
				"当前浏览器不支持屏幕录制功能",
				"NOT_SUPPORTED"
			);
		}

		// 构建媒体约束
		const constraints = buildMediaConstraints(options);

		// 获取媒体流
		const stream = await requestDisplayMedia(constraints, options.mode);

		// 分析流信息
		const result = analyzeMediaStream(stream, options);

		return result;
	} catch (error) {
		if (error instanceof ScreenCaptureError) {
			throw error;
		}

		// 处理标准错误
		if (error instanceof Error) {
			if (error.name === "NotAllowedError") {
				throw new ScreenCaptureError(
					"用户拒绝了屏幕录制权限",
					"PERMISSION_DENIED",
					error
				);
			}
			if (error.name === "NotFoundError") {
				throw new ScreenCaptureError(
					"没有找到可用的显示设备",
					"CAPTURE_FAILED",
					error
				);
			}
			if (error.name === "NotSupportedError") {
				throw new ScreenCaptureError(
					"浏览器不支持请求的捕获配置",
					"NOT_SUPPORTED",
					error
				);
			}
		}

		throw new ScreenCaptureError(
			"捕获屏幕时发生未知错误",
			"UNKNOWN",
			error as Error
		);
	}
}

/**
 * 停止屏幕捕获
 * @param stream 要停止的媒体流
 */
export function stopCapture(stream: MediaStream): void {
	try {
		stream.getTracks().forEach((track) => {
			track.stop();
		});
	} catch (error) {
		console.error("停止捕获时出错:", error);
	}
}

/**
 * 检查屏幕捕获支持情况
 * @returns 支持信息
 */
export function checkCaptureSupport() {
	const hasGetDisplayMedia = !!(
		navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia
	);
	const hasGetUserMedia = !!(
		navigator.mediaDevices && navigator.mediaDevices.getUserMedia
	);

	return {
		screen: hasGetDisplayMedia,
		tab: hasGetDisplayMedia,
		region: hasGetDisplayMedia,
		audio: hasGetUserMedia,
		overall: hasGetDisplayMedia,
	};
}

/**
 * 获取可用的录制分辨率
 * @returns 分辨率选项
 */
export function getAvailableResolutions() {
	return [
		{ label: "1080p (1920×1080)", value: "1080p", width: 1920, height: 1080 },
		{ label: "720p (1280×720)", value: "720p", width: 1280, height: 720 },
		{ label: "480p (854×480)", value: "480p", width: 854, height: 480 },
	];
}

/**
 * 获取可用的帧率选项
 * @returns 帧率选项
 */
export function getAvailableFrameRates() {
	return [
		{ label: "30 fps (推荐)", value: 30 },
		{ label: "24 fps", value: 24 },
		{ label: "20 fps", value: 20 },
		{ label: "15 fps", value: 15 },
	];
}

/**
 * 从录制设置转换为捕获选项
 * @param settings 录制设置
 * @returns 捕获选项
 */
export function recordingSettingsToCaptureOptions(
	settings: RecordingSettings
): CaptureOptions {
	return {
		mode: settings.mode,
		resolution: settings.resolution,
		frameRate: settings.frameRate,
		withAudio: settings.audio,
		cursor: true,
		echoCancellation: true,
		noiseSuppression: true,
	};
}

// 内部工具函数

/**
 * 构建媒体约束
 * @param options 捕获选项
 * @returns 媒体约束
 */
function buildMediaConstraints(
	options: CaptureOptions
): DisplayMediaStreamOptions {
	const resolution = parseResolution(options.resolution);

	const videoConstraints: MediaTrackConstraints = {
		width: { ideal: resolution.width },
		height: { ideal: resolution.height },
		frameRate: { ideal: options.frameRate },
	};

	// 添加光标捕获
	if (options.cursor !== false) {
		(videoConstraints as any).cursor = "always";
	}

	const audioConstraints = options.withAudio
		? {
				echoCancellation: options.echoCancellation !== false,
				noiseSuppression: options.noiseSuppression !== false,
				autoGainControl: true,
				suppressLocalAudioPlayback: true,
		  }
		: false;

	return {
		video: videoConstraints,
		audio: audioConstraints,
	};
}

/**
 * 请求显示媒体
 * @param constraints 媒体约束
 * @param mode 捕获模式
 * @returns 媒体流
 */
async function requestDisplayMedia(
	constraints: DisplayMediaStreamOptions,
	mode: "screen" | "tab" | "area"
): Promise<MediaStream> {
	// 根据模式调整约束
	const adjustedConstraints = { ...constraints };

	// 注意：实际的浏览器 API 目前不支持强制指定捕获类型
	// 这里只是为了将来的扩展性做准备
	if (mode === "tab") {
		// Chrome 可能在未来支持标签页特定捕获
		(adjustedConstraints as any).preferCurrentTab = true;
	} else if (mode === "region") {
		// 区域选择通常通过用户界面完成
		(adjustedConstraints as any).selfBrowserSurface = "exclude";
	}

	return await navigator.mediaDevices.getDisplayMedia(adjustedConstraints);
}

/**
 * 分析媒体流
 * @param stream 媒体流
 * @param options 捕获选项
 * @returns 捕获结果
 */
function analyzeMediaStream(
	stream: MediaStream,
	options: CaptureOptions
): CaptureResult {
	const videoTracks = stream.getVideoTracks();
	const audioTracks = stream.getAudioTracks();

	const videoTrack = videoTracks.length > 0 ? videoTracks[0] : null;
	const audioTrack = audioTracks.length > 0 ? audioTracks[0] : null;

	// 获取实际的视频设置
	const videoSettings = videoTrack?.getSettings() || {};

	return {
		stream,
		mode: options.mode,
		videoTrack,
		audioTrack,
		settings: {
			width: videoSettings.width || 0,
			height: videoSettings.height || 0,
			frameRate: videoSettings.frameRate || options.frameRate,
			hasAudio: audioTracks.length > 0,
		},
	};
}

/**
 * 解析分辨率字符串
 * @param resolution 分辨率字符串
 * @returns 宽高对象
 */
function parseResolution(resolution: string): {
	width: number;
	height: number;
} {
	switch (resolution) {
		case "1080p":
			return { width: 1920, height: 1080 };
		case "720p":
			return { width: 1280, height: 720 };
		case "480p":
			return { width: 854, height: 480 };
		default:
			return { width: 1280, height: 720 }; // 默认 720p
	}
}

/**
 * 获取流的详细信息
 * @param stream 媒体流
 * @returns 流信息
 */
export function getStreamInfo(stream: MediaStream) {
	const videoTracks = stream.getVideoTracks();
	const audioTracks = stream.getAudioTracks();

	return {
		id: stream.id,
		active: stream.active,
		video: {
			count: videoTracks.length,
			tracks: videoTracks.map((track) => ({
				id: track.id,
				kind: track.kind,
				label: track.label,
				enabled: track.enabled,
				muted: track.muted,
				readyState: track.readyState,
				settings: track.getSettings(),
			})),
		},
		audio: {
			count: audioTracks.length,
			tracks: audioTracks.map((track) => ({
				id: track.id,
				kind: track.kind,
				label: track.label,
				enabled: track.enabled,
				muted: track.muted,
				readyState: track.readyState,
				settings: track.getSettings(),
			})),
		},
	};
}

/**
 * 监听流状态变化
 * @param stream 媒体流
 * @param callbacks 回调函数
 * @returns 清理函数
 */
export function watchStreamStatus(
	stream: MediaStream,
	callbacks: {
		onTrackEnded?: (track: MediaStreamTrack) => void;
		onStreamInactive?: () => void;
	}
): () => void {
	const cleanupFunctions: (() => void)[] = [];

	// 监听轨道结束
	if (callbacks.onTrackEnded) {
		stream.getTracks().forEach((track) => {
			const handler = () => callbacks.onTrackEnded?.(track);
			track.addEventListener("ended", handler);
			cleanupFunctions.push(() => track.removeEventListener("ended", handler));
		});
	}

	// 监听流变为非活动状态
	if (callbacks.onStreamInactive) {
		const handler = () => callbacks.onStreamInactive?.();
		stream.addEventListener("inactive", handler);
		cleanupFunctions.push(() =>
			stream.removeEventListener("inactive", handler)
		);
	}

	// 返回清理函数
	return () => {
		cleanupFunctions.forEach((cleanup) => cleanup());
	};
}
