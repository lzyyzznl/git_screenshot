declare module "gif.js" {
	interface GIFOptions {
		workers?: number;
		quality?: number;
		width?: number;
		height?: number;
		workerScript?: string;
	}

	interface FrameOptions {
		delay?: number;
		copy?: boolean;
	}

	class GIF {
		constructor(options?: GIFOptions);
		addFrame(
			element: HTMLCanvasElement | HTMLImageElement,
			options?: FrameOptions
		): void;
		render(): void;
		on(event: "finished", callback: (blob: Blob) => void): void;
		on(event: "error", callback: (error: Error) => void): void;
		on(event: "progress", callback: (progress: number) => void): void;
	}

	export = GIF;
}
