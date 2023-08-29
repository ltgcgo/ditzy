"use strict";

import ChokerStream from "../shaper/choker.mjs";

// DitzyMeek client should directly operate on web streams

let DitzyMeek = class extends EventTarget {
	CONNECTING = 0;
	OPEN = 1;
	CLOSING = 2;
	CLOSED = 3;
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
	binaryType = "text"; // "text" or "binary" (Uint8Array)
	get readyState() {
		return this.#readyState;
	};
	get url() {
		return this.#url;
	};
	get bufferedAmount() {
		return 0;
	};
	close() {};
	send() {};
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
