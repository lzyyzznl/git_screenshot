// Note: Vue types need to be available in the project
import { ref, computed } from "vue";
import { VideoConverter } from "../utils/videoConverter";
import type {
	ConversionOptions as ConverterOptions,
	GIFOptions,
} from "../utils/videoConverter";

// 视频格式类型
export type VideoFormat = "webm" | "mp4" | "gif";

// 转换状态
export type ConversionStatus = "idle" | "converting" | "completed" | "error";

// 视频信息接口
export interface VideoInfo {
	size: number;
	duration: number;
	format: VideoFormat;
	url: string;
	name: string;
}

// 视频转换请求选项接口（用户层面）
export interface VideoConversionOptions {
	format: VideoFormat;
	quality?: number;
	fps?: number;
	width?: number;
	height?: number;
}

export interface UseVideoReturn {
	// 状态
	originalVideo: any; // ref<VideoInfo | null>
	convertedVideos: any; // ref<VideoInfo[]>
	conversionStatus: any; // ref<ConversionStatus>
	conversionProgress: any; // ref<number>
	conversionError: any; // ref<string | null>

	// 计算属性
	isConverting: any; // computed<boolean>
	hasOriginalVideo: any; // computed<boolean>
	formattedFileSize: any; // computed<string>

	// 方法
	setOriginalVideo: (videoBlob: Blob, format: VideoFormat) => void;
	convertVideo: (options: VideoConversionOptions) => Promise<VideoInfo | null>;
	downloadVideo: (video: VideoInfo) => void;
	downloadOriginal: () => void;
	clearVideos: () => void;
	getVideoUrl: (video: VideoInfo) => string;
	revokeVideoUrl: (video: VideoInfo) => void;
}

export function useVideo(): UseVideoReturn {
	// 状态管理
	const originalVideo = ref<VideoInfo | null>(null);
	const convertedVideos = ref<VideoInfo[]>([]);
	const conversionStatus = ref<ConversionStatus>("idle");
	const conversionProgress = ref(0);
	const conversionError = ref<string | null>(null);

	// 视频转换器实例
	const videoConverter = new VideoConverter();

	// 计算属性
	const isConverting = computed(() => conversionStatus.value === "converting");

	const hasOriginalVideo = computed(() => originalVideo.value !== null);

	const formattedFileSize = computed(() => {
		if (!originalVideo.value) return "0B";

		const size = originalVideo.value.size;
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

	// 设置原始视频
	function setOriginalVideo(videoBlob: Blob, format: VideoFormat): void {
		// 先清理之前的视频URL
		if (originalVideo.value) {
			URL.revokeObjectURL(originalVideo.value.url);
		}

		// 创建新的视频信息
		const url = URL.createObjectURL(videoBlob);
		const name = `recording.${format}`;

		originalVideo.value = {
			size: videoBlob.size,
			duration: 0, // 需要通过video元素获取实际时长
			format,
			url,
			name,
		};

		// 获取视频时长
		getVideoDuration(url).then((duration) => {
			if (originalVideo.value) {
				originalVideo.value.duration = duration;
			}
		});

		// 清理转换状态
		conversionStatus.value = "idle";
		conversionProgress.value = 0;
		conversionError.value = null;
	}

	// 转换视频
	async function convertVideo(
		options: VideoConversionOptions
	): Promise<VideoInfo | null> {
		if (!originalVideo.value) {
			conversionError.value = "No original video to convert";
			return null;
		}

		try {
			conversionStatus.value = "converting";
			conversionProgress.value = 0;
			conversionError.value = null;

			// 获取原始视频Blob
			const response = await fetch(originalVideo.value.url);
			const originalBlob = await response.blob();

			let convertedBlob: Blob;

			// 将数字质量转换为字符串质量
			const qualityMap = (quality?: number): "high" | "medium" | "low" => {
				if (!quality) return "medium";
				if (quality >= 0.8) return "high";
				if (quality >= 0.5) return "medium";
				return "low";
			};

			// 根据目标格式进行转换
			if (options.format === "mp4") {
				const converterOptions: ConverterOptions = {
					quality: qualityMap(options.quality),
					width: options.width,
					height: options.height,
					onProgress: (progress) => {
						conversionProgress.value = progress;
					},
				};
				convertedBlob = await videoConverter.convertToMP4(
					originalBlob,
					converterOptions
				);
			} else if (options.format === "gif") {
				const gifOptions: GIFOptions = {
					quality: qualityMap(options.quality),
					frameRate: options.fps || 15,
					width: options.width || 480,
					height: options.height || 360,
					onProgress: (progress) => {
						conversionProgress.value = progress;
					},
				};
				convertedBlob = await videoConverter.convertToGIF(
					originalBlob,
					gifOptions
				);
			} else {
				// WebM格式，直接返回原始文件
				convertedBlob = originalBlob;
			}

			// 创建转换后的视频信息
			const convertedUrl = URL.createObjectURL(convertedBlob);
			const convertedName = `recording.${options.format}`;

			const videoInfo: VideoInfo = {
				size: convertedBlob.size,
				duration: originalVideo.value.duration,
				format: options.format,
				url: convertedUrl,
				name: convertedName,
			};

			// 检查是否已存在相同格式的转换结果
			const existingIndex = convertedVideos.value.findIndex(
				(v) => v.format === options.format
			);

			if (existingIndex >= 0) {
				// 清理旧的URL
				URL.revokeObjectURL(convertedVideos.value[existingIndex].url);
				// 替换现有的转换结果
				convertedVideos.value[existingIndex] = videoInfo;
			} else {
				// 添加新的转换结果
				convertedVideos.value.push(videoInfo);
			}

			conversionStatus.value = "completed";
			conversionProgress.value = 100;

			return videoInfo;
		} catch (error) {
			conversionError.value =
				error instanceof Error ? error.message : "Conversion failed";
			conversionStatus.value = "error";
			console.error("Video conversion error:", error);
			return null;
		}
	}

	// 下载视频
	function downloadVideo(video: VideoInfo): void {
		const link = document.createElement("a");
		link.href = video.url;
		link.download = video.name;
		link.style.display = "none";

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// 下载原始视频
	function downloadOriginal(): void {
		if (originalVideo.value) {
			downloadVideo(originalVideo.value);
		}
	}

	// 清理所有视频
	function clearVideos(): void {
		// 清理原始视频URL
		if (originalVideo.value) {
			URL.revokeObjectURL(originalVideo.value.url);
			originalVideo.value = null;
		}

		// 清理转换后的视频URLs
		convertedVideos.value.forEach((video) => {
			URL.revokeObjectURL(video.url);
		});
		convertedVideos.value = [];

		// 重置状态
		conversionStatus.value = "idle";
		conversionProgress.value = 0;
		conversionError.value = null;
	}

	// 获取视频URL
	function getVideoUrl(video: VideoInfo): string {
		return video.url;
	}

	// 撤销视频URL
	function revokeVideoUrl(video: VideoInfo): void {
		URL.revokeObjectURL(video.url);
	}

	// 获取视频时长的辅助函数
	function getVideoDuration(url: string): Promise<number> {
		return new Promise((resolve) => {
			const video = document.createElement("video");
			video.preload = "metadata";

			video.onloadedmetadata = () => {
				resolve(video.duration);
				URL.revokeObjectURL(url);
			};

			video.onerror = () => {
				resolve(0);
				URL.revokeObjectURL(url);
			};

			video.src = url;
		});
	}

	// 格式化时长
	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	}

	// 获取视频预览信息
	function getVideoPreview(video: VideoInfo) {
		return {
			name: video.name,
			format: video.format.toUpperCase(),
			size: formatFileSize(video.size),
			duration: formatDuration(video.duration),
			url: video.url,
		};
	}

	// 格式化文件大小辅助函数
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes}B`;
		} else if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)}KB`;
		} else if (bytes < 1024 * 1024 * 1024) {
			return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
		} else {
			return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
		}
	}

	return {
		// 状态
		originalVideo,
		convertedVideos,
		conversionStatus,
		conversionProgress,
		conversionError,

		// 计算属性
		isConverting,
		hasOriginalVideo,
		formattedFileSize,

		// 方法
		setOriginalVideo,
		convertVideo,
		downloadVideo,
		downloadOriginal,
		clearVideos,
		getVideoUrl,
		revokeVideoUrl,
	};
}
