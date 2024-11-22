import type { Metadata } from "@/types/plugin";
import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";

/**
 * 获取系统文件（夹）的信息
 * @param path 路径
 */
export const metadata = (path: string) => {
	return invoke<Metadata>(FS_EXTRA_PLUGIN.METADATA, {
		path,
	});
};

/**
 * 在默认程序中或者文件资源管理器指定路径
 * @param path 文件路径
 * @param finder 是否在 finder（文件资源管理器） 中打开，false 是用文件默认的程序打开
 */
export const openPath = (path: string, finder = true) => {
	return invoke(FS_EXTRA_PLUGIN.OPEN_PATH, {
		path,
		finder,
	});
};

export const readFileBlob = async (path: string): Promise<Blob> => {
	const u8a = await readFile(path);

	const blob = new Blob([u8a], {
		type: "application/octet-stream",
	});

	return blob;
};
