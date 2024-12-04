import { ensureDir } from "@/plugins/fsExtra";
import type { ClipboardPayload } from "@/types/plugin";
import { writeFile } from "@tauri-apps/plugin-fs";
import { t } from "i18next";
import { pick } from "lodash-es";
import { nanoid } from "nanoid";
import { decrypt, encrypt } from "./crypto";
import { getSaveSyncDir } from "./path";

const clientId = nanoid();

type Payload = Pick<ClipboardPayload, "type" | "value" | "search">;

const latestSync = {
	value: "",
	set: function ({ type, value }: Payload) {
		this.value = `${type}|${value}`;
	},
	checkIsSame: function ({ type, value }: Payload) {
		return this.value === `${type}|${value}`;
	},
};

enum SYNC_SERVER_PATH {
	DOWNLOAD = "/api/sync",
	DOWNLOAD_FILE = "/api/sync/file",
	SSE = "/api/sync/sse",
	UPLOAD = "/api/sync",
}

function buildUrl(path: string) {
	if (!globalStore.sync.serverAddress || !globalStore.sync.roomId) {
		throw new Error("sync no serverAddress or no roomId");
	}

	const url = new URL(`${globalStore.sync.serverAddress}${path}`);
	url.searchParams.set("clientId", clientId);
	url.searchParams.set("roomId", globalStore.sync.roomId);

	return url;
}

async function buildFormData(payload: Payload) {
	const formData = new FormData();

	await Promise.all(
		Object.entries(payload).map(async ([k, v]) => {
			// value 加密
			if (k === "value") {
				const str = await encrypt(v, globalStore.sync.secret);
				formData.append(k, str);
			} else {
				// 其他字段直接传输
				formData.append(k, v);
			}

			// 类型是图片或文件的需要特殊处理下
			if (k !== "type" && v !== undefined) {
				return;
			}

			// 图片
			if (v === "image") {
				const path = resolveImagePath(payload.value);
				const blob = await readFileBlob(path);

				const encryptedBlob = await encrypt(blob, globalStore.sync.secret);
				formData.append("blobs", encryptedBlob);
			}
			// 文件
			else if (v === "files") {
				const list = JSON.parse(payload.value);

				for (const path of list) {
					const blob = await readFileBlob(path);
					const encryptedBlob = await encrypt(blob, globalStore.sync.secret);
					formData.append("blobs", encryptedBlob);
				}
			}
		}),
	);

	return formData;
}

async function upload(payload: ClipboardPayload, maxSize = 0) {
	const url = buildUrl(SYNC_SERVER_PATH.UPLOAD);
	const formData = await buildFormData(
		pick(payload, ["type", "value", "search"]),
	);

	if (["image", "files"].includes(payload.type ?? "") && !!maxSize) {
		const size = ([...formData.getAll("blobs")] as Blob[]).reduce(
			(sum, { size }) => {
				return sum + size;
			},
			0,
		);

		// 大小超过限制
		if (size >= maxSize * 1024 * 1024) {
			return;
		}
	}

	const res = await fetch(url, {
		method: "post",
		body: formData,
	});

	if (globalStore.sync.enableUploadTooltip) {
		if (res.ok) {
			notify(payload.value);
		} else if (res.status < 500) {
			const json = await res.json();
			notify(json.message);
		} else {
			notify(t("sync.hints.server_failed"));
		}
	}
}

async function downloadFile(filename: string, index: number) {
	const url = buildUrl(SYNC_SERVER_PATH.DOWNLOAD_FILE);
	url.searchParams.set("i", `${index}`);

	const res = await fetch(url, {
		method: "get",
	});

	const blob = await res.blob();
	const decodedBlob = await decrypt(blob, globalStore.sync.secret);
	const arrayBuffer = await decodedBlob.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	await ensureDir(getSaveSyncDir());

	const path = `${getSaveSyncDir()}${nanoid()}-${filename}`;
	await writeFile(path, uint8Array);

	return path;
}

async function download(basePayload?: Payload) {
	let json: Payload;

	if (!basePayload) {
		const url = buildUrl(SYNC_SERVER_PATH.DOWNLOAD);

		const res = await fetch(url, {
			method: "get",
		});

		json = await res.json();
	} else {
		json = basePayload;
	}

	json.value = await decrypt(json.value, globalStore.sync.secret);

	if (json.type === "image") {
		const filename = json.value.replace(getSaveImageDir(), "");
		const path = await downloadFile(filename, 0);
		// 原生写入剪切板会计算hash, 导致保存2份图片,
		// 同时也无法比较从服务器同步下来的图片和最后一次剪切板图片是否相同
		// 这里改成 文件, 只会保存一次
		json.type = "files";
		json.value = JSON.stringify([path]);
	} else if (json.type === "files") {
		const list: string[] = JSON.parse(json.value);
		const newList = await Promise.all(
			list.map(async (path, index) => {
				const filename = path.replace(/.*[\/\\]/, "");
				return downloadFile(filename, index);
			}),
		);

		json.value = JSON.stringify(newList);
	}

	return json;
}

async function download2clipboard(isPaste = false, basePayload?: Payload) {
	const json = await download(basePayload);

	latestSync.set(json);
	await writeClipboard(json);

	if (globalStore.sync.enableDownloadTooltip) {
		notify(`${t("sync.hints.download_success")} ${json?.value || ""}`);
	}

	if (isPaste) {
		return paste();
	}
}

function getDownloadEventSource() {
	const url = buildUrl(SYNC_SERVER_PATH.SSE);
	const eventSource = new EventSource(url);

	return eventSource;
}

export type { Payload };
export {
	download,
	download2clipboard,
	getDownloadEventSource,
	latestSync,
	upload,
};
