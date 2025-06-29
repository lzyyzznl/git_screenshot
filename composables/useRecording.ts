import { ref, computed, onUnmounted } from "vue";
import type { RecordingSettings } from "../types/recording";
import {
	RecordingService,
	type RecordingOptions,
} from "../utils/recordingService";
import { PerformanceMonitor } from "../utils/performanceManager";

// 定义录制模式类型
export type RecordingMode = "screen" | "tab" | "area";

// 扩展录制选项以包含模式
export interface ExtendedRecordingOptions extends RecordingOptions {
	mode: RecordingMode;
	audio: boolean;
	resolution: string;
	frameRate: number;
}

export interface UseRecordingReturn {
	// 状态
	isRecording: any; // ref<boolean>
	isPaused: any; // ref<boolean>
	recordingMode: any; // ref<RecordingMode>
	recordingDuration: any; // ref<number>
	recordingFileSize: any; // ref<number>
	recordingError: any; // ref<string | null>

	// 计算属性
	formattedDuration: any; // computed<string>
	formattedFileSize: any; // computed<string>
	recordingStatus: any; // computed<string>

	// 方法
	startRecording: (options: ExtendedRecordingOptions) => Promise<boolean>;
	pauseRecording: () => boolean;
	resumeRecording: () => boolean;
	stopRecording: () => Promise<Blob | null>;
	resetRecording: () => void;
}

export function useRecording(): UseRecordingReturn {
	// 状态管理
	const isRecording = ref(false);
	const isPaused = ref(false);
	const recordingMode = ref<RecordingMode>("tab");
	const recordingDuration = ref(0);
	const recordingFileSize = ref(0);
	const recordingError = ref<string | null>(null);

	// 服务实例
	const recordingService = new RecordingService();
	const performanceMonitor = PerformanceMonitor.getInstance();

	// 定时器
	let durationInterval: number | null = null;
	let sizeInterval: number | null = null;
	let mediaRecorder: MediaRecorder | null = null;

	// 计算属性
	const formattedDuration = computed(() => {
		const hours = Math.floor(recordingDuration.value / 3600);
		const minutes = Math.floor((recordingDuration.value % 3600) / 60);
		const seconds = recordingDuration.value % 60;

		if (hours > 0) {
			return `${hours.toString().padStart(2, "0")}:${minutes
				.toString()
				.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		}
		return `${minutes.toString().padStart(2, "0")}:${seconds
			.toString()
			.padStart(2, "0")}`;
	});

	const formattedFileSize = computed(() => {
		const size = recordingFileSize.value;
		if (size < 1024) {
			return `${size}B`;
		} else if (size < 1024 * 1024) {
			return `${(size / 1024).toFixed(1)}KB`;
		} else if (size < 1024 * 1024 * 1024) {
			return `${(size / (1024 * 1024)).toFixed(1)}MB`;
		} else {
			return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
		}
	});

	const recordingStatus = computed(() => {
		if (recordingError.value) return "error";
		if (isPaused.value) return "paused";
		if (isRecording.value) return "recording";
		return "idle";
	});

	// 开始录制
	async function startRecording(
		options: ExtendedRecordingOptions
	): Promise<boolean> {
		try {
			recordingError.value = null;
			recordingMode.value = options.mode;

			// 获取媒体流 - 这里需要实现获取流的逻辑
			const stream = await getMediaStream(options);

			// 创建录制设置
			const settings: RecordingSettings = {
				resolution: options.resolution,
				frameRate: options.frameRate,
				audio: options.audio,
				mode: options.mode,
			};

			// 启动性能监控
			performanceMonitor.startMonitoring();

			// 开始录制
			mediaRecorder = await recordingService.startRecording(
				stream,
				settings,
				options
			);

			isRecording.value = true;
			isPaused.value = false;
			recordingDuration.value = 0;
			recordingFileSize.value = 0;

			// 启动计时器
			startTimers();

			return true;
		} catch (error) {
			recordingError.value =
				error instanceof Error ? error.message : "Failed to start recording";
			console.error("Recording start error:", error);
			return false;
		}
	}

	// 暂停录制
	function pauseRecording(): boolean {
		try {
			if (!isRecording.value || isPaused.value) return false;

			recordingService.pauseRecording();
			isPaused.value = true;
			stopTimers();

			return true;
		} catch (error) {
			recordingError.value =
				error instanceof Error ? error.message : "Failed to pause recording";
			console.error("Recording pause error:", error);
			return false;
		}
	}

	// 恢复录制
	function resumeRecording(): boolean {
		try {
			if (!isRecording.value || !isPaused.value) return false;

			recordingService.resumeRecording();
			isPaused.value = false;
			startTimers();

			return true;
		} catch (error) {
			recordingError.value =
				error instanceof Error ? error.message : "Failed to resume recording";
			console.error("Recording resume error:", error);
			return false;
		}
	}

	// 停止录制
	async function stopRecording(): Promise<Blob | null> {
		try {
			if (!isRecording.value) return null;

			// 停止计时器
			stopTimers();

			// 停止性能监控
			performanceMonitor.stopMonitoring();

			// 停止录制服务
			const recordedBlob = await recordingService.stopRecording();

			// 重置状态
			isRecording.value = false;
			isPaused.value = false;
			mediaRecorder = null;

			return recordedBlob;
		} catch (error) {
			recordingError.value =
				error instanceof Error ? error.message : "Failed to stop recording";
			console.error("Recording stop error:", error);

			// 确保状态重置
			isRecording.value = false;
			isPaused.value = false;
			mediaRecorder = null;

			return null;
		}
	}

	// 重置录制状态
	function resetRecording(): void {
		stopTimers();
		isRecording.value = false;
		isPaused.value = false;
		recordingDuration.value = 0;
		recordingFileSize.value = 0;
		recordingError.value = null;
		recordingMode.value = "tab";
		mediaRecorder = null;
	}

	// 启动计时器
	function startTimers(): void {
		// 时长计时器 - 每秒更新
		durationInterval = window.setInterval(() => {
			if (isRecording.value && !isPaused.value) {
				recordingDuration.value++;
			}
		}, 1000);

		// 文件大小更新 - 每100ms更新
		sizeInterval = window.setInterval(() => {
			if (isRecording.value && !isPaused.value) {
				recordingFileSize.value = recordingService.getRecordingSize();
			}
		}, 100);
	}

	// 停止计时器
	function stopTimers(): void {
		if (durationInterval !== null) {
			clearInterval(durationInterval);
			durationInterval = null;
		}

		if (sizeInterval !== null) {
			clearInterval(sizeInterval);
			sizeInterval = null;
		}
	}

	// 获取媒体流 - 简化版实现
	async function getMediaStream(
		options: ExtendedRecordingOptions
	): Promise<MediaStream> {
		// 这里应该使用实际的屏幕捕获逻辑
		// 简化版实现，实际项目中应该使用screenCapture.ts
		const constraints = {
			video: true,
			audio: options.audio,
		};

		return await navigator.mediaDevices.getDisplayMedia(constraints as any);
	}

	// 组件卸载时的清理
	onUnmounted(() => {
		stopTimers();

		// 如果正在录制，尝试停止
		if (isRecording.value) {
			stopRecording().catch(console.error);
		}

		// 停止性能监控
		performanceMonitor.stopMonitoring();
	});

	return {
		// 状态
		isRecording,
		isPaused,
		recordingMode,
		recordingDuration,
		recordingFileSize,
		recordingError,

		// 计算属性
		formattedDuration,
		formattedFileSize,
		recordingStatus,

		// 方法
		startRecording,
		pauseRecording,
		resumeRecording,
		stopRecording,
		resetRecording,
	};
}
