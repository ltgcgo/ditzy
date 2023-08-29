"use strict";

import ChokerStream from "../shaper/choker.mjs";

// DitzyMeek client should directly operate on web streams

let utf8Encode = new TextEncoder(),
utf8Decode = new TextDecoder("utf-8", {fatal: true});

let DitzyHTTP = class extends EventTarget {
	CONNECTING = 0; // Queue data
	OPEN = 1; // Send and queue data
	CLOSING = 2; // Rejects sending
	CLOSED = 3; // Rejects sending
	PROFILE_REALTIME = {
		realtime: true
	}; // Just send the fuck out as soon as there are something. High priority.
	PROFILE_BALANCED = {
		maxTime: 100,
		chunk: 65536,
		maxSize: 1048576
	}; // The default Meek behaviour. 100ms maxTime, 65536 choking, 1048576 maxSize. Automatic priority.
	PROFILE_BUNDLED = {
		maxTime: 250,
		chunk: 262144,
		maxSize: 4194304
	}; // 250ms maxTime, 262144 choking, 4194304 maxSize. Automatic priority.
	#url;
	#sse; // Arbitrary server-sent events. WIP
	#timeSync = false; // Time Sync extension. WIP
	#realtime;
	#maxTime;
	#maxSize;
	#chunk; // Normalized chunk size in the choker
	#headers;
	#redirect;
	#readyState = 0;
	#dataQueue = [];
	#activeRequest;
	binaryType = "text"; // "text" (UTF-8) or "binary" (Uint8Array). "text" will return String if UTF-8 decoding succeeds, or else directly Uint8Array.
	get readyState() {
		return this.#readyState;
	};
	get url() {
		return this.#url;
	};
	get bufferedAmount() {
		return 0;
	};
	#trueClose(payload) {};
	#scheduleData(data) {};
	close(payload = "NoError") {
		// String only
		this.#scheduleData([0, utf8Encode.encode(payload)]);
		this.#readyState = this.CLOSING;
	};
	send(data) {
		if (this.#readyState >> 1) {
			throw(new Error(`Cannot send data through a closed connection.`));
		};
		// Normalize into Uint8Array before sending
		switch (data.constructor) {
			case Uint8Array: {
				break;
			};
			case Int8Array:
			case Uint8ClampedArray:
			case Int16Array:
			case Uint16Array:
			case Int32Array:
			case Uint32Array:
			case Float32Array:
			case Float64Array:
			case BigInt64Array:
			case BigUint64Array:
			case ArrayBuffer: {
				data = new Uint8Array(data);
				break;
			};
			case Blob: {
				throw(new TypeError(`Blobs cannot be sent via Ditzy directly. Read as ArrayBuffer first.`));
				break;
			};
			case String: {
				data = utf8Encode.encode(data);
				break;
			};
			default: {
				throw(new TypeError(`Unrecognized data.`));
			};
		};
		this.#scheduleData([4, data]);
	};
	constructor(url = "", options = {}) {
		// headers and redirect behaves the same as fetch headers
		// timeSync extension is a work in progress.
		let upThis = this;
		let {headers, redirect, profile, timeSync} = options;
		if (!profile) {
			profile = upThis.PROFILE_BALANCED;
		};
		upThis.#headers = headers;
		upThis.#redirect = redirect;
		upThis.#timeSync = timeSync;
		upThis.#realtime = profile.realtime;
		upThis.#chunk = profile.chunk;
		upThis.#maxTime = profile.maxTime;
		upThis.#maxSize = profile.maxSize;
		upThis.#url = url;
	};
};

export {
	DitzyHTTP
};
