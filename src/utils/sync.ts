import type { ClipboardPayload } from "@/types/plugin";
import { writeFile } from "@tauri-apps/plugin-fs";
import { t } from "i18next";
import { pick } from "lodash-es";
import { nanoid } from "nanoid";
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
      formData.append(k, v);

      if (k !== "type" && v !== undefined) {
        return;
      }

      // 图片
      if (v === "image") {
        const path = getSaveImagePath(payload.value);
        const blob = await readFileBlob(path);

        formData.append("blobs", blob);
      }
      // 文件
      else if (v === "files") {
        const list = JSON.parse(payload.value);

        for (const path of list) {
          const blob = await readFileBlob(path);
          formData.append("blobs", blob);
        }
      }
    })
  );

  return formData;
}

async function upload(payload: ClipboardPayload, maxSize = 0) {
  const url = buildUrl(SYNC_SERVER_PATH.UPLOAD);
  const formData = await buildFormData(
    pick(payload, ["type", "value", "search"])
  );

  if (["image", "files"].includes(payload.type ?? "") && !!maxSize) {
    const size = ([...formData.getAll("blobs")] as Blob[]).reduce(
      (sum, { size }) => {
        sum += size;
        return sum;
      },
      0
    );

    // 大小超过限制
    if (size >= maxSize * 1024 * 1024) {
      console.log("=======max size over===========", { size: size / 1024 / 1024, maxSize });
      return;
    }
  }

  const res = await fetch(url, {
    method: "post",
    body: formData,
  });

  console.log("=======upload===========", res.status);

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
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

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
      })
    );

    json.value = JSON.stringify(newList);
  }

  return json;
}

async function download2clipboard(isPaste = false, basePayload?: Payload) {
  const json = await download(basePayload);
  console.log("===========writeClipboard=======", json);

  latestSync.set(json);
  await writeClipboard(json);

  if (globalStore.sync.enableDownloadTooltip) {
    notify(t("sync.hints.download_success") + " " + basePayload?.value || "");
  }

  if (isPaste) {
    return paste();
  }
}

function syncDownloadListen() {
  const url = buildUrl(SYNC_SERVER_PATH.SSE);
  const eventSource = new EventSource(url);

  eventSource.onmessage = async (data) => {
    console.log("=========eventSource=========", data);
    await download2clipboard();
  };

  eventSource.onerror = (error) => {
    console.error("EventSource failed:", error);
  };
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
  latestSync,
  getDownloadEventSource,
  syncDownloadListen,
  upload,
};
