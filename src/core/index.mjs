"use strict";

import ChokerStream from "../shaper/choker.mjs";
import {
	VLVDecoder,
	VLVEncoder
} from "../vlv/index.mjs";

// DitzyMeek client should directly operate on web streams

let utf8Encode = new TextEncoder(),
utf8Decode = new TextDecoder("utf-8", {fatal: true});
let vlvDecode = new VLVDecoder(),
vlvEncode = new VLVEncoder();
let byteIterator = new BigUint64Array(1);

// The current iteration is single threaded without a connection pool.
// This will greatly impact the performance, but will make the dev cycle faster.

// Connection pools are planned for the second iteration. Hope the code would be reusable by then.

let DitzyHTTP = class extends EventTarget {
	CONNECTING = 0; // Queue data
	OPEN = 1; // Send and queue data
	CLOSING = 2; // Rejects sending
	CLOSED = 3; // Rejects sending
	PROFILE_REALTIME = {
		realtime: true,
		maxTime: 10,
		chunk: 1,
		maxSize: Infinity
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
	#sendLock = false;
	#sentSize = 0;
	#activeRequest;
	#connId; // 0 ~ 2^48 - 1
	#frameId = 0;
	binaryType = "text"; // "text" (UTF-8) or "binary" (Uint8Array). "text" will return String if UTF-8 decoding succeeds, or else directly Uint8Array.
	get readyState() {
		return this.#readyState;
	};
	get url() {
		return this.#url;
	};
	get bufferedAmount() {
		let sum = 0;
		this.#dataQueue.forEach((e) => {
			sum += e.byteLength;
		});
		return sum;
	};
	async #swapRequest() {
		let upThis = this;
		if (!upThis.#activeRequest) {
			upThis.#scheduleData([2, new Uint8Array(1)]);
			// Swap the current ReadableStream controller out with a new one
			let originSource = new ReadableStream({
				start: (controller) => {
					// Enables send lock
					console.debug(`SEND_LOCK_ENABLE`);
					upThis.#sendLock = true;
					setTimeout(() => {
						// Close the stream once the maximum send time exceeds
						controller.close();
						upThis.#activeRequest = null;
						upThis.#sendLock = true;
						console.debug(`DATA_SEND_CLOSE`);
					}, upThis.#maxTime);
				},
				pull: async (controller) => {
					if (upThis.#dataQueue.length) {
						// Enqueue a message into the stream
						let target = upThis.#dataQueue.shift();
						console.debug(`DATA_SEND_QUEUE: ${target.byteLength} B`);
						controller.enqueue(target);
					} else {
						// Release send lock to allow direct writes
						console.debug(`SEND_LOCK_DISABLE`);
						upThis.#sendLock = false;
					};
				}
			});
			let chokedSource = new ChokerStream(upThis.#chunk);
			let signal,
			sendFunc = async () => {
				signal = AbortSignal.timeout(10000);
				signal.addEventListener("timeout", () => {
					upThis.close(`SEND_FAIL_TIMEOUT`);
				});
				upThis.#readyState = 1;
				let response;
				try {
					response = await fetch(upThis.#url, {
						"method": "post",
						"headers": upThis.#headers,
						"body": chokedSource.source,
						"redirect": upThis.#redirect || "follow",
						"keepalive": true,
						"priority": upThis.#realtime ? "high" : "auto",
						signal
					});
					console.debug(`RECV_STATUS: ${response.status}`);
					if (/* response.status == 200*/true) {
						// Run the decoder!
					} else {
						upThis.close(`SEND_FAIL_STATUS: ${response.status} ${response.statusText}`);
					};
				} catch (err) {
					upThis.close(`SEND_FAIL_ERROR: ${err}\n${err.stack}`);
				};
			};
			chokedSource.attach(originSource);
			await sendFunc();
			if (upThis.#dataQueue.length) {
				setTimeout(() => {
					upThis.#swapRequest();
				}, 1);
			} else {
				setTimeout(() => {
					upThis.#swapRequest();
				}, 2000);
			};
		} else {
			console.debug(`SWAP_ERROR_CONFLICT`);
		};
	};
	#encodeData(dataElement) {
		let upThis = this;
		let [type, payload] = dataElement;
		let frame = vlvEncode.encode(upThis.#frameId);
		let dataSize = vlvEncode.encode(payload.byteLength);
		let size = 1 + upThis.#connId.byteLength + frame.byteLength + dataSize.byteLength + payload.byteLength;
		console.debug(`DATA_ENCODE: ${upThis.#frameId} ${type} ${payload.byteLength}(${size})`);
		let buffer = new Uint8Array(size);
		let pointer = 1;
		buffer[0] = type;
		buffer.set(pointer, upThis.#connId);
		pointer += upThis.#connId.byteLength;
		buffer.set(pointer, frame);
		pointer += frame.byteLength;
		buffer.set(pointer, dataSize);
		pointer += dataSize.byteLength;
		buffer.set(pointer, payload);
		return buffer;
	};
	#trueClose(payload) {
		console.debug(`CONN_CLOSED`);
		this.#readyState = this.CLOSED;
	};
	#scheduleData(data) {
		//console.debug(data);
		let upThis = this;
		if (upThis.#activeRequest && !upThis.#sendLock) {
			upThis.#activeRequest.enqueue(upThis.#encodeData(data));
			console.debug(`DATA_SEND_DIRECT: ${upThis.#frameId}`);
		} else {
			upThis.#dataQueue.push(upThis.#encodeData(data));
			console.debug(`DATA_QUEUE: ${upThis.#frameId}`);
		};
		upThis.#frameId ++;
	};
	close(payload = "NO_ERROR") {
		// String only
		this.#scheduleData([0, utf8Encode.encode(payload)]);
		this.#readyState = this.CLOSING;
		console.debug(`CONN_CLOSE: ${payload}`);
		this.dispatchEvent(new CloseEvent("close", {
			"reason": payload
		}));
	};
	send(data) {
		if (this.#readyState >> 1) {
			throw(new Error(`Cannot send data through a closed connection.`));
			return;
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
		super();
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
		// Prepares the connection
		crypto.getRandomValues(byteIterator);
		upThis.#connId = vlvEncode.encodeBint(byteIterator[0]);
		// Prepares the transport
		upThis.#scheduleData([1, vlvEncode.encode(1023)]); // Creates a new restored connection
		upThis.#swapRequest(); // Initiates the transport underneath
	};
};

export {
	DitzyHTTP
};
