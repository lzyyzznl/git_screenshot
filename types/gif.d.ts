declare module "gif.js" {
	interface GIFOptions {
		workers?: number;
		quality?: number;
		width?: number;
		height?: number;
		workerScript?: string;
		debug?: boolean;
		dither?: boolean;
		background?: string;
		transparent?: string | null;
	}

	interface FrameOptions {
		delay?: number;
		copy?: boolean;
	}

	class GIF {
		constructor(options?: GIFOptions);
		addFrame(canvas: HTMLCanvasElement, options?: FrameOptions): void;
		render(): void;
		on(event: "finished", callback: (blob: Blob) => void): void;
		on(event: "error", callback: (error: unknown) => void): void;
		on(event: "progress", callback: (progress: number) => void): void;
	}

	export default GIF;
}
