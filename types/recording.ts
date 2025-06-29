// 录制设置接口
export interface RecordingSettings {
	resolution: string;
	frameRate: number;
	audio: boolean;
	mode: "screen" | "tab" | "area";
}

// 录制状态接口
export interface RecordingState {
	isRecording: boolean;
	isPaused: boolean;
	mode: "screen" | "tab" | "area" | null;
	startTime: number | null;
	duration: number;
	fileSize: number;
	settings: RecordingSettings;
	mediaStream: MediaStream | null;
	mediaRecorder: MediaRecorder | null;
	recordedChunks: Blob[];
	// 绘图工具相关状态
	drawingTool?: string;
	drawingColor?: string;
	brushSize?: number;
}

// 消息类型
export interface RecordingMessage {
	action:
		| "startRecording"
		| "stopRecording"
		| "pauseRecording"
		| "resumeRecording"
		| "getRecordingState"
		| "updateSettings";
	config?: RecordingSettings;
	settings?: Partial<RecordingSettings>;
}

// 录制数据存储格式
export interface RecordingData {
	data: number[];
	size: number;
	type: string;
	timestamp: number;
}
