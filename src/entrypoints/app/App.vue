<template>
	<div class="app-container">
		<header class="app-header">
			<div class="logo">
				<h1>🎬 GifShot</h1>
				<p>屏幕录制 GIF 插件</p>
			</div>
			<div class="actions">
				<button @click="openPopup" class="btn-secondary">弹窗模式</button>
			</div>
		</header>

		<main class="app-main">
			<div v-if="!isRecording && !gifPreview" class="record-section">
				<h2>选择录制类型</h2>
				<div class="record-grid">
					<div class="record-card" @click="startRecording('tab')">
						<div class="card-icon">📄</div>
						<h3>当前标签页</h3>
						<p>录制当前浏览器标签页内容</p>
					</div>
					<div class="record-card" @click="startRecording('window')">
						<div class="card-icon">🖥️</div>
						<h3>整个桌面</h3>
						<p>录制整个桌面屏幕</p>
					</div>
					<div class="record-card" @click="startRecording('application')">
						<div class="card-icon">📱</div>
						<h3>应用窗口</h3>
						<p>录制特定应用程序窗口</p>
					</div>
				</div>

				<div class="settings-panel">
					<h3>录制设置</h3>
					<div class="setting-item">
						<label>录制时长 (秒):</label>
						<input
							v-model.number="recordDuration"
							type="number"
							min="1"
							max="60"
							class="setting-input"
						/>
					</div>
					<div class="setting-item">
						<label>帧率:</label>
						<select v-model="frameRate" class="setting-select">
							<option value="5">5 FPS (文件小)</option>
							<option value="8">8 FPS (推荐)</option>
							<option value="10">10 FPS (文件大)</option>
						</select>
					</div>
				</div>
			</div>

			<div v-if="isRecording" class="recording-section">
				<div class="recording-display">
					<div class="recording-indicator">
						<span class="pulse"></span>
						<span class="text">正在录制...</span>
					</div>
					<div class="timer">{{ formatTime(recordedTime) }}</div>
					<div class="progress-bar">
						<div
							class="progress-fill"
							:style="{ width: (recordedTime / recordDuration) * 100 + '%' }"
						></div>
					</div>
					<button @click="stopRecording" class="btn-stop">⏹️ 停止录制</button>
				</div>
			</div>

			<div v-if="isProcessing" class="processing-section">
				<div class="processing-display">
					<div class="loader"></div>
					<h3>正在生成 GIF...</h3>
					<p class="progress-text">{{ processingStatus }}</p>
				</div>
			</div>

			<div v-if="gifPreview" class="preview-section">
				<h2>GIF 预览</h2>
				<div class="preview-container">
					<img :src="gifPreview" alt="GIF预览" class="gif-preview" />
					<div class="preview-info">
						<p>大小: {{ gifSize }}</p>
						<p>尺寸: {{ gifDimensions }}</p>
					</div>
				</div>
				<div class="preview-actions">
					<button @click="saveGif" class="btn-primary">💾 保存 GIF</button>
					<button @click="reset" class="btn-secondary">🔄 重新录制</button>
				</div>
			</div>
		</main>

		<footer class="app-footer">
			<p>&copy; 2024 GifShot. Made with ❤️</p>
		</footer>
	</div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { generateGif } from "@/utils/gifGenerator";

const isRecording = ref(false);
const recordedTime = ref(0);
const recordDuration = ref(10);
const frameRate = ref(8);
const gifPreview = ref<string | null>(null);
const isProcessing = ref(false);
const processingStatus = ref("准备中...");
const gifSize = ref("");
const gifDimensions = ref("");

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let timer: number | null = null;

const formatTime = (seconds: number) => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, "0")}:${secs
		.toString()
		.padStart(2, "0")}`;
};

const formatFileSize = (bytes: number) => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const openPopup = () => {
	// 在 wxt 中，我们可以通过打开新窗口的方式模拟弹窗
	window.open(
		browser.runtime.getURL("popup.html"),
		"popup",
		"width=400,height=500"
	);
};

const startRecording = async (type: "tab" | "window" | "application") => {
	try {
		processingStatus.value = "请求屏幕权限...";

		const constraints: DisplayMediaStreamOptions = {
			video: true,
			audio: false,
		};

		const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

		recordedChunks = [];
		recordedTime.value = 0;
		isRecording.value = true;

		mediaRecorder = new MediaRecorder(stream, {
			mimeType: "video/webm",
		});

		mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				recordedChunks.push(event.data);
			}
		};

		mediaRecorder.onstop = async () => {
			stream.getTracks().forEach((track) => track.stop());
			await processRecording();
		};

		mediaRecorder.start();

		timer = window.setInterval(() => {
			recordedTime.value++;
			if (recordedTime.value >= recordDuration.value) {
				stopRecording();
			}
		}, 1000);
	} catch (err) {
		console.error("录制失败:", err);
		alert(
			"录制失败，请检查权限设置: " +
				(err instanceof Error ? err.message : String(err))
		);
	}
};

const stopRecording = () => {
	if (mediaRecorder && mediaRecorder.state === "recording") {
		mediaRecorder.stop();
	}

	if (timer) {
		clearInterval(timer);
		timer = null;
	}

	isRecording.value = false;
};

const processRecording = async () => {
	if (recordedChunks.length === 0) return;

	isProcessing.value = true;
	processingStatus.value = "正在处理视频...";

	try {
		const blob = new Blob(recordedChunks, { type: "video/webm" });

		processingStatus.value = "正在生成 GIF...";
		const gifBlob = await generateGif(blob, {
			fps: frameRate.value,
			quality: 10,
		});

		// 获取文件信息
		gifSize.value = formatFileSize(gifBlob.size);

		// 创建临时图片来获取尺寸
		const tempImg = new Image();
		const reader = new FileReader();

		reader.onload = () => {
			const dataUrl = reader.result as string;
			tempImg.onload = () => {
				gifDimensions.value = `${tempImg.width} × ${tempImg.height}`;
			};
			tempImg.src = dataUrl;
			gifPreview.value = dataUrl;
			isProcessing.value = false;
		};

		reader.readAsDataURL(gifBlob);
	} catch (err) {
		console.error("GIF生成失败:", err);
		alert("GIF生成失败: " + (err instanceof Error ? err.message : String(err)));
		isProcessing.value = false;
	}
};

const saveGif = async () => {
	if (!gifPreview.value) return;

	try {
		// 使用 browser API 进行保存
		const response = await browser.runtime.sendMessage({
			type: "SAVE_GIF",
			dataUrl: gifPreview.value,
			filename: `gifshot-${Date.now()}.gif`,
		});

		if (response.success) {
			alert("GIF 保存成功！");
		} else {
			throw new Error(response.error || "保存失败");
		}
	} catch (err) {
		console.error("保存失败:", err);
		alert("保存失败: " + (err instanceof Error ? err.message : String(err)));
	}
};

const reset = () => {
	gifPreview.value = null;
	recordedTime.value = 0;
	recordedChunks = [];
	gifSize.value = "";
	gifDimensions.value = "";
	processingStatus.value = "准备中...";
};

onUnmounted(() => {
	if (timer) {
		clearInterval(timer);
	}
	if (mediaRecorder && mediaRecorder.state === "recording") {
		mediaRecorder.stop();
	}
});
</script>
