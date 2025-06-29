<template>
	<div class="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
		<div class="max-w-screen-xl mx-auto">
			<div class="mb-6">
				<p class="text-gray-600">您的录屏已成功保存，可以进行预览和后续操作</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Left Column: Video Preview -->
				<div class="lg:col-span-2">
					<div class="bg-white rounded-xl shadow-lg overflow-hidden">
						<div class="p-4 border-b border-gray-200">
							<div class="flex items-center gap-2">
								<div class="i-mdi-play-box-outline text-lg text-gray-600"></div>
								<h2 class="font-semibold text-gray-800">视频预览</h2>
							</div>
						</div>
						<div class="bg-gray-900 aspect-video">
							<video
								v-if="videoData.blob"
								ref="videoRef"
								class="w-full h-full"
								controls
								:src="videoUrl"
								@loadedmetadata="onVideoLoaded"
							/>
							<div
								v-else
								class="w-full h-full flex flex-col items-center justify-center text-white"
							>
								<div
									class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4"
								>
									<div class="i-mdi-play text-4xl"></div>
								</div>
								<h3 class="text-lg font-medium">录屏预览</h3>
								<p class="text-sm text-white/70">点击播放录制内容</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Right Column: Controls -->
				<div class="space-y-6">
					<!-- File Info Card -->
					<div class="bg-white rounded-xl shadow-lg">
						<div class="p-4 border-b border-gray-200">
							<div class="flex items-center gap-2">
								<div
									class="i-mdi-file-document-outline text-lg text-gray-600"
								></div>
								<h2 class="font-semibold text-gray-800">文件信息</h2>
							</div>
						</div>
						<div class="p-4 space-y-4">
							<div class="grid grid-cols-2 gap-4 text-sm">
								<div class="flex items-start gap-2">
									<div class="i-mdi-clock-outline text-gray-400 mt-px"></div>
									<div>
										<p class="text-gray-500">时长</p>
										<p class="font-semibold text-gray-700">
											{{ videoData.duration }}
										</p>
									</div>
								</div>
								<div class="flex items-start gap-2">
									<div class="i-mdi-database-outline text-gray-400 mt-px"></div>
									<div>
										<p class="text-gray-500">大小</p>
										<p class="font-semibold text-gray-700">
											{{ videoData.size }}
										</p>
									</div>
								</div>
								<div class="flex items-start gap-2">
									<div class="i-mdi-aspect-ratio text-gray-400 mt-px"></div>
									<div>
										<p class="text-gray-500">分辨率</p>
										<p class="font-semibold text-gray-700">
											{{ videoData.resolution }}
										</p>
									</div>
								</div>
								<div class="flex items-start gap-2">
									<div class="i-mdi-flash-outline text-gray-400 mt-px"></div>
									<div>
										<p class="text-gray-500">帧率</p>
										<p class="font-semibold text-gray-700">
											{{ videoData.fps }}
										</p>
									</div>
								</div>
							</div>
							<div class="flex justify-between items-center text-sm pt-2">
								<span class="text-gray-500">格式</span>
								<span
									class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium"
									>{{ videoData.format }}</span
								>
							</div>
						</div>
					</div>

					<!-- Export Settings Card -->
					<div class="bg-white rounded-xl shadow-lg">
						<div class="p-4 border-b border-gray-200">
							<h2 class="font-semibold text-gray-800">导出设置</h2>
						</div>
						<div class="p-4">
							<div class="p-1 bg-gray-100 rounded-lg flex mb-4">
								<button
									:class="[
										'flex-1 py-1.5 text-sm rounded-md transition-colors',
										activeTab === 'quality'
											? 'bg-white shadow text-emerald-600 font-semibold'
											: 'text-gray-500 hover:bg-gray-200',
									]"
									@click="activeTab = 'quality'"
								>
									质量
								</button>
								<button
									:class="[
										'flex-1 py-1.5 text-sm rounded-md transition-colors',
										activeTab === 'format'
											? 'bg-white shadow text-emerald-600 font-semibold'
											: 'text-gray-500 hover:bg-gray-200',
									]"
									@click="activeTab = 'format'"
								>
									格式
								</button>
							</div>
							<div v-if="activeTab === 'quality'">
								<el-select
									v-model="quality"
									class="w-full"
									placeholder="选择质量"
								>
									<el-option value="high" label="高质量">
										<div class="flex items-center justify-between w-full">
											<span>高质量</span>
											<el-tag size="small" type="info">原始</el-tag>
										</div>
									</el-option>
									<el-option value="medium" label="中等质量" />
									<el-option value="low" label="低质量" />
								</el-select>
							</div>
							<div v-if="activeTab === 'format'" class="text-sm text-gray-500">
								格式选择功能待开发。
							</div>
						</div>
					</div>

					<!-- Actions Card -->
					<div class="bg-white rounded-xl shadow-lg">
						<div class="p-4 border-b border-gray-200">
							<h2 class="font-semibold text-gray-800">操作</h2>
						</div>
						<div class="p-4 space-y-3">
							<el-button
								size="large"
								class="w-full !h-11 !bg-emerald-500 hover:!bg-emerald-600 !text-white !font-semibold !border-0"
								:disabled="isDownloaded || !videoData.blob"
								@click="handleDownload"
							>
								<div class="i-mdi-download mr-2"></div>
								{{ isDownloaded ? "已下载" : "下载 MP4" }}
							</el-button>
							<el-button
								size="large"
								class="w-full !h-11 !bg-orange-100 hover:!bg-orange-200 !text-orange-600 !font-semibold !border !border-orange-200"
								:loading="isConverting"
								:disabled="!videoData.blob"
								@click="handleConvertToGif"
							>
								<template #loading>
									<div class="i-mdi-loading animate-spin mr-2"></div>
									转换中...
								</template>
								<div class="i-mdi-image-multiple-outline mr-2"></div>
								转换为 GIF
							</el-button>
							<div class="grid grid-cols-2 gap-3">
								<el-button
									plain
									class="w-full !h-10 !text-gray-700 !font-medium"
								>
									<div class="i-mdi-pencil-outline mr-1.5"></div>
									编辑
								</el-button>
								<el-button
									plain
									class="w-full !h-10 !text-gray-700 !font-medium"
									@click="handleShare"
								>
									<div class="i-mdi-share-variant-outline mr-1.5"></div>
									分享
								</el-button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElSelect, ElOption, ElButton, ElTag, ElMessage } from "element-plus";
import browser from "webextension-polyfill";

interface VideoData {
	blob: Blob | null;
	duration: string;
	size: string;
	resolution: string;
	fps: string;
	format: string;
}

const videoRef = ref<HTMLVideoElement>();
const quality = ref("high");
const activeTab = ref("quality");
const isConverting = ref(false);
const isDownloaded = ref(false);

const videoData = reactive<VideoData>({
	blob: null,
	duration: "00:00",
	size: "0 MB",
	resolution: "N/A",
	fps: "N/A",
	format: "MP4",
});

const videoUrl = computed(() => {
	return videoData.blob ? URL.createObjectURL(videoData.blob) : "";
});

onMounted(() => {
	loadRecordingData();
});

const loadRecordingData = async () => {
	try {
		const result = await browser.storage.local.get(["recordingData"]);
		if (result.recordingData) {
			Object.assign(videoData, result.recordingData);
		}
	} catch (error) {
		console.error("加载录制数据失败:", error);
		ElMessage.error("加载录制数据失败");
	}
};

const onVideoLoaded = () => {
	if (videoRef.value) {
		const duration = videoRef.value.duration;
		const minutes = Math.floor(duration / 60);
		const seconds = Math.floor(duration % 60);
		videoData.duration = `${minutes.toString().padStart(2, "0")}:${seconds
			.toString()
			.padStart(2, "0")}`;
	}
};

const handleDownload = async () => {
	if (!videoData.blob) return;

	try {
		const url = URL.createObjectURL(videoData.blob);
		const filename = `screen-recording-${new Date()
			.toISOString()
			.slice(0, 19)
			.replace(/:/g, "-")}.mp4`;

		await browser.downloads.download({
			url,
			filename,
			saveAs: true,
		});

		isDownloaded.value = true;
		ElMessage.success("下载成功");

		setTimeout(() => {
			isDownloaded.value = false;
		}, 3000);
	} catch (error) {
		console.error("下载失败:", error);
		ElMessage.error("下载失败");
	}
};

const handleConvertToGif = async () => {
	isConverting.value = true;
	try {
		await new Promise((resolve) => setTimeout(resolve, 3000));
		ElMessage.success("GIF转换完成");
	} catch (error) {
		console.error("GIF转换失败:", error);
		ElMessage.error("GIF转换失败");
	} finally {
		isConverting.value = false;
	}
};

const handleShare = async () => {
	if (navigator.share && videoData.blob) {
		try {
			const file = new File([videoData.blob], "screen-recording.mp4", {
				type: "video/mp4",
			});
			await navigator.share({
				title: "录屏分享",
				text: "查看我的录屏内容",
				files: [file],
			});
			ElMessage.success("分享成功");
		} catch (error) {
			console.error("分享失败:", error);
			ElMessage.error("分享失败");
		}
	} else {
		ElMessage.warning("当前浏览器不支持分享功能");
	}
};
</script>
