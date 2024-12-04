const SALT_LEN = 16;
const IV_LEN = 12;

interface CombineOutputParam {
	salt: Uint8Array;
	iv: Uint8Array;
	encrypted: ArrayBuffer;
}

type EncryptReturn<T extends string> = T extends undefined ? string : Blob;
type ReturnStringOrBlob<T extends string | Blob> = T extends string
	? string
	: Blob;

function checkIsString(value: any): value is string {
	return typeof value === "string";
}

function getDataType(data: string | Blob) {
	if (checkIsString(data)) {
		return undefined;
	}

	return data.type;
}

async function encodeInput(data: string | Blob) {
	if (typeof data === "string") {
		return new TextEncoder().encode(data);
	}

	return data.arrayBuffer();
}

function combineOutput<T extends string>(
	{ salt, iv, encrypted }: CombineOutputParam,
	type?: T,
): EncryptReturn<T> {
	if (!type) {
		const encryptedData = btoa(
			String.fromCharCode(...new Uint8Array(encrypted)),
		);
		const ivString = btoa(String.fromCharCode(...iv));
		const saltString = btoa(String.fromCharCode(...salt));

		return `${saltString}:${ivString}:${encryptedData}` as EncryptReturn<T>;
	}

	// 将加密数据、IV 和盐值合并为一个 Blob
	return new Blob([salt, iv, new Uint8Array(encrypted)], {
		type,
	}) as EncryptReturn<T>;
}

async function encrypt<T extends string | Blob>(
	data: T,
	masterPassword?: string,
): Promise<ReturnStringOrBlob<T>> {
	if (!masterPassword) {
		return data as ReturnStringOrBlob<T>;
	}

	// 生成一个随机的盐值
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));

	// 使用 PBKDF2 从主密码派生密钥
	const keyMaterial = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(masterPassword),
	);

	const importKey = await crypto.subtle.importKey(
		"raw",
		keyMaterial,
		{ name: "PBKDF2" },
		false,
		["deriveBits", "deriveKey"],
	);

	const derivedKey = await crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt,
			iterations: 100000,
			hash: "SHA-256",
		},
		importKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);

	// 根据数据类型准备数据
	const dataToEncrypt = await encodeInput(data);

	// 生成一个随机的初始化向量 (IV)
	const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

	// 使用 AES-GCM 加密数据
	const encrypted = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		derivedKey,
		dataToEncrypt,
	);

	return combineOutput(
		{ salt, iv, encrypted },
		getDataType(data),
	) as ReturnStringOrBlob<T>;
}

async function decodeInput(combinedData: string | Blob) {
	if (typeof combinedData === "string") {
		const [saltString, ivString, encryptedDataString] = combinedData.split(":");

		const salt = new Uint8Array(
			atob(saltString)
				.split("")
				.map((c) => c.charCodeAt(0)),
		);
		const iv = new Uint8Array(
			atob(ivString)
				.split("")
				.map((c) => c.charCodeAt(0)),
		);
		const encrypted = new Uint8Array(
			atob(encryptedDataString)
				.split("")
				.map((c) => c.charCodeAt(0)),
		);

		return { salt, iv, encrypted };
	}

	// 将 Blob 转换成 ArrayBuffer
	const arrayBuffer = await new Response(combinedData).arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	// 提取盐值、IV 和加密数据
	const salt = uint8Array.slice(0, SALT_LEN); // 盐值是 16 字节
	const iv = uint8Array.slice(SALT_LEN, SALT_LEN + IV_LEN); //  IV 是 12 字节
	const encrypted = uint8Array.slice(SALT_LEN + IV_LEN);

	return { salt, iv, encrypted };
}

async function decrypt<T extends string | Blob>(
	combinedData: T,
	masterPassword?: string,
): Promise<ReturnStringOrBlob<T>> {
	if (!masterPassword) {
		return combinedData as ReturnStringOrBlob<T>;
	}

	const { salt, iv, encrypted } = await decodeInput(combinedData);

	// 使用 PBKDF2 从主密码派生密钥 (与加密过程相同)
	const keyMaterial = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(masterPassword),
	);
	const derivedKey = await crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt,
			iterations: 100000,
			hash: "SHA-256",
		},
		await crypto.subtle.importKey(
			"raw",
			keyMaterial,
			{ name: "PBKDF2" },
			false,
			["deriveBits", "deriveKey"],
		),
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);

	// 使用 AES-GCM 解密数据
	const decrypted = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		derivedKey,
		encrypted,
	);

	// 根据原始数据类型返回结果
	if (checkIsString(combinedData)) {
		return new TextDecoder().decode(decrypted) as ReturnStringOrBlob<T>;
	}

	return new Blob([decrypted], {
		type: getDataType(combinedData),
	}) as ReturnStringOrBlob<T>;
}

export { encrypt, decrypt };
