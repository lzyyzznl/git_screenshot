<template>
	<div class="popup-container">
		<div class="header">
			<h2>🎬 GifShot</h2>
			<p>屏幕录制 GIF 插件</p>
			<button @click="openFullApp" class="open-app-btn">🚀 完整版</button>
		</div>

		<div class="content">
			<div v-if="!isRecording && !gifPreview" class="record-options">
				<h3>选择录制类型</h3>
				<div class="option-buttons">
					<button @click="startRecording('tab')" class="option-btn">
						<span class="icon">📄</span>
						当前标签页
					</button>
					<button @click="startRecording('window')" class="option-btn">
						<span class="icon">🖥️</span>
						整个桌面
					</button>
					<button @click="startRecording('application')" class="option-btn">
						<span class="icon">📱</span>
						应用窗口
					</button>
				</div>

				<div class="settings">
					<label>
						录制时长 (秒):
						<input
							v-model.number="recordDuration"
							type="number"
							min="1"
							max="60"
						/>
					</label>
				</div>
			</div>

			<div v-if="isRecording" class="recording">
				<div class="recording-indicator">
					<span class="pulse"></span>
					正在录制...
				</div>
				<div class="timer">{{ formatTime(recordedTime) }}</div>
				<button @click="stopRecording" class="stop-btn">停止录制</button>
			</div>

			<div v-if="gifPreview" class="preview">
				<h3>GIF 预览</h3>
				<img :src="gifPreview" alt="GIF预览" class="gif-preview" />
				<div class="preview-actions">
					<button @click="saveGif" class="save-btn">保存 GIF</button>
					<button @click="reset" class="reset-btn">重新录制</button>
				</div>
			</div>

			<div v-if="isProcessing" class="processing">
				<div class="loader"></div>
				<p>正在生成 GIF...</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { generateGif } from "@/utils/gifGenerator";

const isRecording = ref(false);
const recordedTime = ref(0);
const recordDuration = ref(10);
const gifPreview = ref<string | null>(null);
const isProcessing = ref(false);

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

const startRecording = async (type: "tab" | "window" | "application") => {
	try {
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

	try {
		const blob = new Blob(recordedChunks, { type: "video/webm" });
		const gifBlob = await generateGif(blob);

		const reader = new FileReader();
		reader.onload = () => {
			gifPreview.value = reader.result as string;
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
};

const openFullApp = async () => {
	try {
		await browser.tabs.create({
			url: browser.runtime.getURL("app.html"),
		});
	} catch (error) {
		console.error("打开完整版失败:", error);
		alert(
			"打开完整版失败: " +
				(error instanceof Error ? error.message : String(error))
		);
	}
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
