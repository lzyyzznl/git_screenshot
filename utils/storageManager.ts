export interface StorageConfig {
	dbName: string;
	version: number;
	chunkSize: number; // MB
	maxStorageSize: number; // MB
	autoCleanup: boolean;
	retentionDays: number;
}

export interface StoredChunk {
	id: string;
	sessionId: string;
	index: number;
	data: Blob;
	timestamp: number;
	size: number;
	mimeType: string;
}

export interface StorageSession {
	id: string;
	startTime: number;
	endTime?: number;
	totalSize: number;
	chunkCount: number;
	mimeType: string;
	metadata?: any;
}

export class StorageManager {
	private static instance: StorageManager;
	private config: StorageConfig;
	private db?: IDBDatabase;
	private initPromise?: Promise<void>;

	private constructor(config?: Partial<StorageConfig>) {
		this.config = {
			dbName: "ScreenRecorderDB",
			version: 1,
			chunkSize: 50, // 50MB per chunk
			maxStorageSize: 500, // 500MB total
			autoCleanup: true,
			retentionDays: 7,
			...config,
		};
	}

	/**
	 * 获取单例实例
	 */
	static getInstance(config?: Partial<StorageConfig>): StorageManager {
		if (!StorageManager.instance) {
			StorageManager.instance = new StorageManager(config);
		}
		return StorageManager.instance;
	}

	/**
	 * 初始化数据库
	 */
	async initialize(): Promise<void> {
		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this.initDatabase();
		return this.initPromise;
	}

	/**
	 * 初始化IndexedDB数据库
	 */
	private initDatabase(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.config.dbName, this.config.version);

			request.onerror = () => {
				reject(new Error(`Failed to open database: ${request.error?.message}`));
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// 创建sessions存储
				if (!db.objectStoreNames.contains("sessions")) {
					const sessionStore = db.createObjectStore("sessions", {
						keyPath: "id",
					});
					sessionStore.createIndex("startTime", "startTime", { unique: false });
				}

				// 创建chunks存储
				if (!db.objectStoreNames.contains("chunks")) {
					const chunkStore = db.createObjectStore("chunks", { keyPath: "id" });
					chunkStore.createIndex("sessionId", "sessionId", { unique: false });
					chunkStore.createIndex("timestamp", "timestamp", { unique: false });
				}
			};
		});
	}

	/**
	 * 创建新的存储会话
	 */
	async createSession(mimeType: string, metadata?: any): Promise<string> {
		await this.initialize();

		const sessionId = this.generateSessionId();
		const session: StorageSession = {
			id: sessionId,
			startTime: Date.now(),
			totalSize: 0,
			chunkCount: 0,
			mimeType,
			metadata,
		};

		await this.storeSession(session);
		console.log(`Created storage session: ${sessionId}`);

		return sessionId;
	}

	/**
	 * 生成会话ID
	 */
	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * 存储会话数据
	 */
	private async storeSession(session: StorageSession): Promise<void> {
		if (!this.db) {
			throw new Error("Database not initialized");
		}

		const transaction = this.db.transaction(["sessions"], "readwrite");
		const store = transaction.objectStore("sessions");

		return new Promise((resolve, reject) => {
			const request = store.put(session);

			request.onsuccess = () => resolve();
			request.onerror = () =>
				reject(new Error(`Failed to store session: ${request.error?.message}`));
		});
	}

	/**
	 * 关闭数据库连接
	 */
	close(): void {
		if (this.db) {
			this.db.close();
			this.db = undefined;
		}
	}
}

// 默认导出单例实例
export const storageManager = StorageManager.getInstance();
