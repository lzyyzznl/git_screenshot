<template>
	<div class="popup-container">
		<div class="header">
			<h2>GifShot</h2>
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
import { ref, onMounted, onUnmounted } from "vue";
import { generateGif } from "../utils/gifGenerator";

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
		const constraints: MediaStreamConstraints = {
			video: {
				// @ts-ignore - Chrome插件中的扩展类型
				mediaSource: type === "tab" ? "tab" : "screen",
			},
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
		alert("录制失败，请检查权限设置");
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
		alert("GIF生成失败");
		isProcessing.value = false;
	}
};

const saveGif = async () => {
	if (!gifPreview.value) return;

	try {
		const response = await fetch(gifPreview.value);
		const blob = await response.blob();

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `gifshot-${Date.now()}.gif`;
		a.click();

		URL.revokeObjectURL(url);
	} catch (err) {
		console.error("保存失败:", err);
		alert("保存失败");
	}
};

const reset = () => {
	gifPreview.value = null;
	recordedTime.value = 0;
	recordedChunks = [];
};

const openFullApp = () => {
	try {
		if (typeof chrome !== "undefined" && chrome.tabs) {
			chrome.tabs.create({
				url: chrome.runtime.getURL("app.html"),
			});
		} else {
			// 如果 chrome API 不可用，尝试直接打开
			window.open(chrome.runtime.getURL("app.html"));
		}
	} catch (error) {
		console.error("打开完整版失败:", error);
		alert("打开完整版失败，请检查插件权限");
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

<style lang="less" scoped>
.popup-container {
	width: 300px;
	padding: 16px;
	font-family: "Microsoft YaHei", sans-serif;

	.header {
		text-align: center;
		margin-bottom: 20px;

		h2 {
			margin: 0 0 4px 0;
			color: #2c3e50;
			font-size: 20px;
		}

		p {
			margin: 0;
			color: #7f8c8d;
			font-size: 12px;
		}

		.open-app-btn {
			padding: 8px 16px;
			background: #3498db;
			color: white;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
			margin-top: 12px;

			&:hover {
				background: #2980b9;
			}
		}
	}

	.content {
		.record-options {
			h3 {
				margin: 0 0 12px 0;
				font-size: 14px;
				color: #34495e;
			}

			.option-buttons {
				display: flex;
				flex-direction: column;
				gap: 8px;
				margin-bottom: 16px;

				.option-btn {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 12px;
					border: 1px solid #ddd;
					border-radius: 6px;
					background: white;
					cursor: pointer;
					transition: all 0.2s;

					&:hover {
						background: #f8f9fa;
						border-color: #3498db;
					}

					.icon {
						font-size: 16px;
					}
				}
			}

			.settings {
				label {
					display: flex;
					justify-content: space-between;
					align-items: center;
					font-size: 12px;
					color: #555;

					input {
						width: 60px;
						padding: 4px;
						border: 1px solid #ddd;
						border-radius: 3px;
					}
				}
			}
		}

		.recording {
			text-align: center;

			.recording-indicator {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 8px;
				margin-bottom: 12px;

				.pulse {
					width: 8px;
					height: 8px;
					background: #e74c3c;
					border-radius: 50%;
					animation: pulse 1s infinite;
				}
			}

			.timer {
				font-size: 24px;
				font-weight: bold;
				color: #e74c3c;
				margin-bottom: 16px;
			}

			.stop-btn {
				padding: 8px 16px;
				background: #e74c3c;
				color: white;
				border: none;
				border-radius: 4px;
				cursor: pointer;

				&:hover {
					background: #c0392b;
				}
			}
		}

		.preview {
			text-align: center;

			h3 {
				margin: 0 0 12px 0;
				font-size: 14px;
				color: #34495e;
			}

			.gif-preview {
				max-width: 100%;
				border: 1px solid #ddd;
				border-radius: 4px;
				margin-bottom: 12px;
			}

			.preview-actions {
				display: flex;
				gap: 8px;
				justify-content: center;

				button {
					padding: 8px 12px;
					border: none;
					border-radius: 4px;
					cursor: pointer;
					font-size: 12px;
				}

				.save-btn {
					background: #27ae60;
					color: white;

					&:hover {
						background: #229954;
					}
				}

				.reset-btn {
					background: #95a5a6;
					color: white;

					&:hover {
						background: #7f8c8d;
					}
				}
			}
		}

		.processing {
			text-align: center;
			padding: 20px;

			.loader {
				width: 40px;
				height: 40px;
				border: 4px solid #f3f3f3;
				border-top: 4px solid #3498db;
				border-radius: 50%;
				animation: spin 1s linear infinite;
				margin: 0 auto 12px;
			}

			p {
				margin: 0;
				color: #7f8c8d;
				font-size: 14px;
			}
		}
	}
}

@keyframes pulse {
	0% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
	100% {
		opacity: 1;
	}
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
