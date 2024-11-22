import type { GlobalStore } from "@/types/store";
import { proxy } from "valtio";
import { subscribeKey as valtioSubscribeKey } from "valtio/utils";

export const globalStore = proxy<GlobalStore>({
	app: {
		autoStart: false,
		silentStart: false,
		showMenubarIcon: true,
		showTaskbarIcon: false,
	},

	appearance: {
		theme: "auto",
		isDark: false,
	},

	update: {
		auto: false,
		beta: false,
	},

	shortcut: {
		clipboard: "Alt+C",
		preference: "Alt+X",
		quickPaste: {
			enable: false,
			value: "Command+Shift",
		},
	},

	sync: {
		enableAutoUpload: false,
		autoUploadType: ["text", "rtf", "html"],
		autoUploadSize: 0,
		enableAutoDownload: false,
		audoDownloadType: ["text", "rtf", "html"],
		autoDownloadSize: 0,
		enableUploadTooltip: true,
		enableDownloadTooltip: true,
		upload: "Command+Shift+C",
		download: "",
		downloadAndPaste: "Command+Shift+V",
		serverAddress: "",
		roomId: "",
		secret: "",
	},

	env: {},
});

export const subscribeKey: typeof valtioSubscribeKey = (
	object,
	key,
	callback,
	immediate,
) => {
	if (immediate) {
		callback(object[key]);
	}

	return valtioSubscribeKey(object, key, callback);
};
