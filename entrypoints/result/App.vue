<template>
	<div class="container mx-auto p-6 max-w-4xl min-h-screen bg-gray-50">
		<!-- 标题栏 -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-800 mb-2">
				<i class="i-carbon-video text-blue-500 mr-2"></i>录制完成
			</h1>
			<p class="text-gray-600">
				录制时长: {{ formatDuration(recordingDuration) }} | 文件大小:
				{{ formatFileSize(recordingFileSize) }}
			</p>
		</div>

		<!-- 视频预览区域 -->
		<div class="relative mb-8 bg-white rounded-xl shadow-lg overflow-hidden">
			<div
				v-if="!videoUrl"
				class="flex items-center justify-center h-96 bg-gray-100"
			>
				<el-loading-spinner size="large" />
				<span class="ml-4 text-gray-500">正在加载录制内容...</span>
			</div>

			<div v-else class="relative">
				<video
					ref="videoPlayer"
					controls
					class="w-full h-auto max-h-96"
					@loadedmetadata="onVideoLoaded"
					@timeupdate="onTimeUpdate"
				>
					<source :src="videoUrl" type="video/webm" />
					您的浏览器不支持视频播放。
				</video>

				<!-- 编辑层画布 -->
				<canvas
					v-if="isEditing"
					ref="annotationCanvas"
					class="absolute top-0 left-0 w-full h-full pointer-events-auto cursor-crosshair"
					@mousedown="startDrawing"
					@mousemove="draw"
					@mouseup="stopDrawing"
					@mouseleave="stopDrawing"
				></canvas>
			</div>
		</div>

		<!-- 操作按钮区域 -->
		<div class="flex flex-wrap gap-4 justify-center mb-8">
			<el-button
				type="primary"
				size="large"
				@click="downloadVideo"
				:loading="isDownloading"
			>
				<i class="i-carbon-download mr-2"></i>
				下载视频
			</el-button>

			<el-button type="success" size="large" @click="toggleGifSettings">
				<i class="i-carbon-image mr-2"></i>
				转换 GIF
			</el-button>

			<el-button
				type="info"
				size="large"
				@click="convertToMP4"
				:loading="isConvertingMP4"
			>
				<i class="i-carbon-video mr-2"></i>
				转换 MP4
			</el-button>

			<el-button
				size="large"
				@click="toggleEditing"
				:type="isEditing ? 'warning' : 'default'"
			>
				<i class="i-carbon-edit mr-2"></i>
				{{ isEditing ? "完成编辑" : "添加标注" }}
			</el-button>

			<el-button size="large" @click="returnToRecording">
				<i class="i-carbon-arrow-left mr-2"></i>
				重新录制
			</el-button>
		</div>

		<!-- 编辑工具栏 -->
		<el-collapse-transition>
			<div v-if="isEditing" class="mb-8 p-4 bg-white rounded-lg shadow">
				<h3 class="text-lg font-medium mb-4 flex items-center">
					<i class="i-carbon-pen mr-2"></i>标注工具
				</h3>

				<div class="flex flex-wrap gap-4 items-center">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">画笔颜色:</span>
						<el-color-picker v-model="drawingColor" size="small" />
					</div>

					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">画笔大小:</span>
						<el-slider
							v-model="drawingSize"
							:min="1"
							:max="20"
							:step="1"
							style="width: 120px"
						/>
					</div>

					<el-button size="small" @click="clearAnnotations">
						<i class="i-carbon-clean mr-1"></i>清除标注
					</el-button>
				</div>
			</div>
		</el-collapse-transition>

		<!-- GIF转换设置 -->
		<el-collapse-transition>
			<div v-if="showGifSettings" class="mb-8 p-6 bg-white rounded-lg shadow">
				<h3 class="text-lg font-medium mb-4 flex items-center">
					<i class="i-carbon-image mr-2"></i>GIF 转换设置
				</h3>

				<el-form label-width="80px">
					<el-row :gutter="20">
						<el-col :span="12">
							<el-form-item label="质量">
								<el-radio-group v-model="gifQuality">
									<el-radio-button label="high">高质量</el-radio-button>
									<el-radio-button label="medium">中等</el-radio-button>
									<el-radio-button label="low">压缩</el-radio-button>
								</el-radio-group>
							</el-form-item>
						</el-col>

						<el-col :span="12">
							<el-form-item label="帧率">
								<el-slider
									v-model="gifFrameRate"
									:min="5"
									:max="30"
									:step="1"
									show-input
									style="width: 100%"
								/>
							</el-form-item>
						</el-col>
					</el-row>

					<el-row>
						<el-col :span="12">
							<el-form-item label="时间范围">
								<div class="flex items-center gap-2">
									<el-input-number
										v-model="gifStartTime"
										:min="0"
										:max="videoDuration"
										:precision="1"
										size="small"
										placeholder="开始"
									/>
									<span>-</span>
									<el-input-number
										v-model="gifEndTime"
										:min="gifStartTime || 0"
										:max="videoDuration"
										:precision="1"
										size="small"
										placeholder="结束"
									/>
									<span class="text-sm text-gray-500">秒</span>
								</div>
							</el-form-item>
						</el-col>
					</el-row>

					<el-form-item>
						<el-button
							type="primary"
							@click="convertToGif"
							:loading="isConverting"
							size="large"
						>
							<i class="i-carbon-play mr-2"></i>
							开始转换
						</el-button>
					</el-form-item>
				</el-form>
			</div>
		</el-collapse-transition>

		<!-- 转换进度 -->
		<div v-if="conversionProgress > 0 && conversionProgress < 100" class="mb-8">
			<div class="bg-white p-6 rounded-lg shadow">
				<h4 class="text-lg font-medium mb-4">转换进度</h4>
				<el-progress
					:percentage="conversionProgress"
					:status="conversionStatus"
					:stroke-width="8"
				/>
				<p class="text-center text-sm text-gray-500 mt-3">
					{{ progressMessage }}
				</p>
			</div>
		</div>

		<!-- 成功提示 -->
		<div v-if="conversionComplete" class="mb-8">
			<el-alert title="转换完成！" type="success" :closable="false" show-icon>
				<template #default>
					<div class="flex items-center justify-between">
						<span>GIF 文件已生成完成</span>
						<el-button type="success" size="small" @click="downloadGif">
							<i class="i-carbon-download mr-1"></i>下载 GIF
						</el-button>
					</div>
				</template>
			</el-alert>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
	VideoConverter,
	VideoConversionError,
} from "../../utils/videoConverter";

// 响应式数据
const videoPlayer = ref<HTMLVideoElement>();
const annotationCanvas = ref<HTMLCanvasElement>();

// 录制数据
const videoUrl = ref<string>("");
const recordingDuration = ref<number>(0);
const recordingFileSize = ref<number>(0);
const videoDuration = ref<number>(0);
const videoBlob = ref<Blob | null>(null);

// 视频转换器
const videoConverter = new VideoConverter();

// 编辑状态
const isEditing = ref<boolean>(false);
const drawingColor = ref<string>("#ff0000");
const drawingSize = ref<number>(3);
const isDrawing = ref<boolean>(false);
const canvasContext = ref<CanvasRenderingContext2D | null>(null);

// GIF转换
const showGifSettings = ref<boolean>(false);
const gifQuality = ref<string>("medium");
const gifFrameRate = ref<number>(15);
const gifStartTime = ref<number>(0);
const gifEndTime = ref<number>(0);
const isConverting = ref<boolean>(false);
const conversionProgress = ref<number>(0);
const conversionStatus = ref<string>("");
const progressMessage = ref<string>("");
const conversionComplete = ref<boolean>(false);
const gifBlob = ref<Blob | null>(null);

// MP4转换状态
const isConvertingMP4 = ref<boolean>(false);
const mp4ConversionProgress = ref<number>(0);
const mp4Blob = ref<Blob | null>(null);
const mp4ConversionComplete = ref<boolean>(false);

// 下载状态
const isDownloading = ref<boolean>(false);

// 生命周期
onMounted(async () => {
	await loadRecordingData();
});

// 方法定义
const loadRecordingData = async () => {
	try {
		// 从浏览器存储加载录制数据
		const result = await browser.storage.local.get([
			"recordingData",
			"recordingState",
		]);

		if (result.recordingData) {
			const { data, size, type, timestamp } = result.recordingData;

			// 将数组数据转换为Blob
			const uint8Array = new Uint8Array(data);
			const blob = new Blob([uint8Array], { type });

			// 保存blob引用用于转换
			videoBlob.value = blob;

			// 创建对象URL
			videoUrl.value = URL.createObjectURL(blob);
			recordingFileSize.value = size;
		}

		if (result.recordingState) {
			recordingDuration.value = result.recordingState.duration || 0;
		}
	} catch (error) {
		console.error("加载录制数据失败:", error);
		ElMessage.error("加载录制数据失败");
	}
};

const onVideoLoaded = () => {
	if (videoPlayer.value) {
		videoDuration.value = videoPlayer.value.duration;
		gifEndTime.value = videoDuration.value;
	}
};

const onTimeUpdate = () => {
	// 可以在这里添加时间更新逻辑
};

const formatDuration = (ms: number): string => {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const formatFileSize = (bytes: number): string => {
	const mb = bytes / (1024 * 1024);
	return `${mb.toFixed(2)} MB`;
};

// 视频下载
const downloadVideo = async () => {
	if (!videoUrl.value) return;

	isDownloading.value = true;
	try {
		const link = document.createElement("a");
		link.href = videoUrl.value;
		link.download = `recording_${new Date().getTime()}.webm`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		ElMessage.success("视频下载已开始");
	} catch (error) {
		console.error("下载失败:", error);
		ElMessage.error("下载失败");
	} finally {
		isDownloading.value = false;
	}
};

// 编辑功能
const toggleEditing = async () => {
	isEditing.value = !isEditing.value;

	if (isEditing.value) {
		await nextTick();
		initCanvas();
	}
};

const initCanvas = () => {
	if (!annotationCanvas.value || !videoPlayer.value) return;

	const canvas = annotationCanvas.value;
	const video = videoPlayer.value;

	// 设置画布尺寸匹配视频
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	canvas.style.width = video.offsetWidth + "px";
	canvas.style.height = video.offsetHeight + "px";

	canvasContext.value = canvas.getContext("2d");
	if (canvasContext.value) {
		canvasContext.value.lineJoin = "round";
		canvasContext.value.lineCap = "round";
	}
};

const startDrawing = (event: MouseEvent) => {
	if (!canvasContext.value) return;

	isDrawing.value = true;
	const rect = annotationCanvas.value!.getBoundingClientRect();
	const x =
		(event.clientX - rect.left) * (annotationCanvas.value!.width / rect.width);
	const y =
		(event.clientY - rect.top) * (annotationCanvas.value!.height / rect.height);

	canvasContext.value.beginPath();
	canvasContext.value.moveTo(x, y);
};

const draw = (event: MouseEvent) => {
	if (!isDrawing.value || !canvasContext.value) return;

	const rect = annotationCanvas.value!.getBoundingClientRect();
	const x =
		(event.clientX - rect.left) * (annotationCanvas.value!.width / rect.width);
	const y =
		(event.clientY - rect.top) * (annotationCanvas.value!.height / rect.height);

	canvasContext.value.lineWidth = drawingSize.value;
	canvasContext.value.strokeStyle = drawingColor.value;
	canvasContext.value.lineTo(x, y);
	canvasContext.value.stroke();
	canvasContext.value.beginPath();
	canvasContext.value.moveTo(x, y);
};

const stopDrawing = () => {
	isDrawing.value = false;
	if (canvasContext.value) {
		canvasContext.value.beginPath();
	}
};

const clearAnnotations = () => {
	if (canvasContext.value && annotationCanvas.value) {
		canvasContext.value.clearRect(
			0,
			0,
			annotationCanvas.value.width,
			annotationCanvas.value.height
		);
	}
};

// GIF转换
const toggleGifSettings = () => {
	showGifSettings.value = !showGifSettings.value;
};

const convertToGif = async () => {
	if (!videoBlob.value) {
		ElMessage.error("视频数据尚未加载");
		return;
	}

	isConverting.value = true;
	conversionProgress.value = 0;
	conversionStatus.value = "";
	progressMessage.value = "正在初始化GIF转换...";
	conversionComplete.value = false;

	try {
		// 计算实际的时间范围
		const startTime = gifStartTime.value || 0;
		const endTime = gifEndTime.value || videoDuration.value;
		const clipDuration = endTime - startTime;

		if (clipDuration <= 0) {
			throw new Error("无效的时间范围");
		}

		// 检查浏览器支持
		const support = VideoConverter.checkSupport();
		if (!support.workers) {
			throw new Error("浏览器不支持Web Workers");
		}

		progressMessage.value = "正在准备视频数据...";

		// 如果需要裁剪，先处理视频片段
		let sourceBlob = videoBlob.value;
		if (startTime > 0 || endTime < videoDuration.value) {
			// 这里可以添加视频裁剪逻辑，暂时使用完整视频
			progressMessage.value = "注意：当前版本使用完整视频进行转换";
		}

		// 开始GIF转换
		const gifOptions = {
			quality: gifQuality.value as "high" | "medium" | "low",
			frameRate: gifFrameRate.value,
			onProgress: (progress: number) => {
				conversionProgress.value = Math.floor(progress);

				if (progress < 30) {
					progressMessage.value = "正在提取视频帧...";
				} else if (progress < 70) {
					progressMessage.value = "正在生成GIF图像...";
				} else if (progress < 90) {
					progressMessage.value = "正在优化文件大小...";
				} else {
					progressMessage.value = "即将完成...";
				}
			},
		};

		progressMessage.value = "开始转换为GIF格式...";
		gifBlob.value = await videoConverter.convertToGIF(sourceBlob, gifOptions);

		conversionStatus.value = "success";
		progressMessage.value = "GIF转换完成！";
		conversionComplete.value = true;

		// 显示转换结果信息
		const info = await videoConverter.getVideoInfo(sourceBlob);
		const gifSize = gifBlob.value.size;
		const compressionRatio = (
			((info.size - gifSize) / info.size) *
			100
		).toFixed(1);

		ElMessage.success(
			`GIF转换完成！文件大小: ${formatFileSize(
				gifSize
			)} (压缩了${compressionRatio}%)`
		);
	} catch (error) {
		console.error("GIF转换失败:", error);
		conversionStatus.value = "exception";

		if (error instanceof VideoConversionError) {
			progressMessage.value = `转换失败: ${error.message}`;
			ElMessage.error(`GIF转换失败: ${error.message}`);
		} else {
			progressMessage.value = "转换失败";
			ElMessage.error("GIF转换失败，请重试");
		}
	} finally {
		isConverting.value = false;
	}
};

// MP4转换方法
const convertToMP4 = async () => {
	if (!videoBlob.value) {
		ElMessage.error("视频数据尚未加载");
		return;
	}

	isConvertingMP4.value = true;
	mp4ConversionProgress.value = 0;
	mp4ConversionComplete.value = false;

	try {
		// 检查浏览器支持
		const support = VideoConverter.checkSupport();
		if (!support.workers || !support.mp4) {
			throw new Error("浏览器不支持MP4转换");
		}

		// 估算转换时间
		const info = await videoConverter.getVideoInfo(videoBlob.value);
		const estimatedTime = VideoConverter.estimateConversionTime(
			info.duration,
			info.size,
			"mp4",
			"medium"
		);

		ElMessage.info(`预计转换时间: ${estimatedTime}秒，请耐心等待...`);

		// 开始MP4转换
		const mp4Options = {
			quality: "medium" as const,
			onProgress: (progress: number) => {
				mp4ConversionProgress.value = Math.floor(progress);
			},
		};

		mp4Blob.value = await videoConverter.convertToMP4(
			videoBlob.value,
			mp4Options
		);
		mp4ConversionComplete.value = true;

		// 显示转换结果
		const originalSize = info.size;
		const mp4Size = mp4Blob.value.size;
		const sizeDiff = mp4Size > originalSize ? "+" : "";
		const sizeChange = (
			((mp4Size - originalSize) / originalSize) *
			100
		).toFixed(1);

		ElMessage.success(
			`MP4转换完成！文件大小: ${formatFileSize(
				mp4Size
			)} (${sizeDiff}${sizeChange}%)`
		);

		// 自动下载MP4
		const link = document.createElement("a");
		link.href = URL.createObjectURL(mp4Blob.value);
		link.download = `recording_${new Date().getTime()}.mp4`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	} catch (error) {
		console.error("MP4转换失败:", error);

		if (error instanceof VideoConversionError) {
			ElMessage.error(`MP4转换失败: ${error.message}`);
		} else {
			ElMessage.error("MP4转换失败，请重试");
		}
	} finally {
		isConvertingMP4.value = false;
	}
};

const downloadGif = () => {
	if (!gifBlob.value) return;

	const link = document.createElement("a");
	link.href = URL.createObjectURL(gifBlob.value);
	link.download = `recording_${new Date().getTime()}.gif`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	ElMessage.success("GIF下载已开始");
};

// 返回录制页面
const returnToRecording = async () => {
	try {
		const result = await ElMessageBox.confirm(
			"确定要重新录制吗？当前的录制内容将会丢失。",
			"确认",
			{
				confirmButtonText: "确定",
				cancelButtonText: "取消",
				type: "warning",
			}
		);

		if (result === "confirm") {
			// 清理当前数据
			await browser.storage.local.remove(["recordingData", "recordingState"]);

			// 关闭当前页面
			window.close();
		}
	} catch (error) {
		// 用户取消
	}
};
</script>

<style scoped>
.container {
	font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

video {
	border-radius: 8px;
}

canvas {
	border-radius: 8px;
}
</style>
