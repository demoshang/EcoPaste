import type { ClipboardPayload } from "@/types/plugin";
import { useSnapshot } from "valtio";

interface State {
	payload?: ClipboardPayload;
}

const INITIAL_STATE: State = {
	payload: undefined,
};

const SyncPanel = () => {
	const { sync } = useSnapshot(globalStore);
	const state = useReactive<State>(INITIAL_STATE);

	// 监听同步到远程的快捷键
	useRegister(async () => {
		if (state.payload) {
			upload(state.payload);
		}
	}, [sync.upload]);

	// 监听同步到本地的快捷键
	useRegister(async () => {
		download2clipboard();
	}, [sync.download]);

	// 监听粘贴到本地的快捷键
	useRegister(async () => {
		download2clipboard(true);
	}, [sync.downloadAndPaste]);

	// 自动同步上传
	useMount(() => {
		onClipboardUpdate((payload) => {
			state.payload = payload;

			// 未开启指定上传
			if (!globalStore.sync.enableAutoUpload) {
				return;
			}

			// 类型不匹配
			if (!globalStore.sync.autoUploadType.includes(payload.type ?? "text")) {
				return;
			}

			const isSame = latestSync.checkIsSame(payload);

			if (!isSame) {
				upload(payload, globalStore.sync.autoUploadSize);
			}
		});
	});

	// 自动同步下载
	useSSE((payload) => {
		download2clipboard(false, payload);
	});

	return <></>;
};

export default SyncPanel;
