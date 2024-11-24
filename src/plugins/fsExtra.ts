import { exists, mkdir, readFile } from "@tauri-apps/plugin-fs";

/**
 * 读取文件为 blob
 * @param path 文件路径
 */
export const readFileBlob = async (path: string): Promise<Blob> => {
	const u8a = await readFile(path);

	const blob = new Blob([u8a], {
		type: "application/octet-stream",
	});

	return blob;
};

/**
 * 确保文件夹存在
 * @param dirPath 文件夹路径
 */
export const ensureDir = async (dirPath: string) => {
	const existsResult = await exists(dirPath);
	if (!existsResult) {
		await mkdir(dirPath, { recursive: true });
	}
};
