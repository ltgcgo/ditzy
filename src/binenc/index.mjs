"use strict";

import {
	VLVEncoder,
	VLVDecoder
} from "../vlv/index.mjs";

const bit48Max = (1n << 48n) - 1n;

let unicode = new TextEncoder();

let DitzyEncoder = class {
	#vlvEnc = new VLVEncoder(6);
	#randomBuffer = new BigUint64Array(1);
	timeout = 15000;
	pool = [];
	getRandom() {
		return crypto.getRandomValues(this.#randomBuffer)[0] & bit48Max;
	};
	cidValid(connId) {
		if ((!connId && connId != 0n) || connId.constructor != BigInt || connId >= bit48Max) {
			throw(new Error("Invalid connection ID."));
		};
	};
	connOpen() {
		let connId = this.getRandom();
		this.pool.push({
			cmd: 1,
			conn: connId,
			frame: 0,
			data: `{"to":${this.timeout}}`
		});
		return connId;
	};
	connClose(connId) {
		this.cidValid(connId);
		this.pool.push({
			cmd: 0,
			conn: connId,
			frame
		});
	};
	validate(data) {
		if (data.buffer) {
			// Return typed arrays
			return data;
		};
		switch (data.constructor) {
			case ArrayBuffer: {
				return data;
				break;
			};
			case String: {
				return unicode.encode(data);
				break;
			};
			case Number: {
				return this.#vlvEnc.encode(data);
				break;
			};
			case BigInt: {
				return this.#vlvEnc.encodeBint(data);
				break;
			};
			default: {
				return unicode.encode(JSON.stringify(data));
			};
		};
	};
	finalize() {
		let proxy = [];
		let lastfid = {};
		// Frame compile
		this.pool.forEach((e) => {
			let cmdBuf = new Uint8Array(1);
			cmdBuf[0] = e.cmd;
		});
		// Done
		delete this.pool;
		this.pool = [];
		return new Blob(proxy);
	};
	constructor() {};
};

let DitzyDecoder = class extends EventTarget {
	decode(stream) {};
	constructor() {
		super();
	};
};

export {
	DitzyEncoder,
	DitzyDecoder
};
