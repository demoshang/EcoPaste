import type { ClipboardPayload } from "@/types/plugin";
import { useSnapshot } from "valtio";

type Payload = Pick<ClipboardPayload, "type" | "value" | "search"> & {
	size: number;
};

export const useSSE = (handler: (msg: Payload) => void) => {
	const [es, setEs] = useState<EventSource | undefined>();
	const { sync } = useSnapshot(globalStore);

	const destroy = () => {
		if (!es) {
			return;
		}

		es.close();
	};

	useEffect(() => {
		if (!sync.enableAutoDownload) {
			return destroy();
		}

		setEs(getDownloadEventSource());

		return () => {
			if (es) {
				es.close();
			}
		};
	}, [sync.enableAutoDownload]);

	useEffect(() => {
		if (!es) {
			return;
		}

		const fn = (me: MessageEvent<any>) => {
			if (me.data === "hello") {
				return;
			}

			const payload: Payload = JSON.parse(me.data);

			if (!!sync.autoDownloadSize && payload.size >= sync.autoDownloadSize) {
				return;
			}

			handler(payload);
		};
		es.addEventListener("message", fn);

		const errorLog = () => {};
		es.addEventListener("error", errorLog);

		return () => {
			es.removeEventListener("message", fn);
			es.removeEventListener("error", errorLog);
		};
	}, [es, handler, sync.autoDownloadSize]);

	return es;
};
