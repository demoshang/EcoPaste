import {
	type Options,
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";

async function notify(options: Options | string) {
	// Do you have permission to send a notification?
	let permissionGranted = await isPermissionGranted();

	// If not we need to request it
	if (!permissionGranted) {
		const permission = await requestPermission();
		permissionGranted = permission === "granted";
	}

	// Once permission has been granted we can send the notification
	if (permissionGranted) {
		sendNotification(options);
	}
}

export { notify };
