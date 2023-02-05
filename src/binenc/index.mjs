"use strict";

import {
	VLVEncoder,
	VLVDecoder
} from "../vlv/index.mjs";

let syxStart = new Uint8Array([240, 126, 127, 4, 64]),
syxEnd = new Uint8Array([247]),
bit48Max = (1n << 48n) - 1n;

let unicode = new TextEncoder();

let DitzyEncoder = class {
	#vlvEnc = new VLVEncoder(6);
	#randomBuffer = new BigUint64Array(1);
	timeout = 30000;
	pool = [];
	getRandom () {
		return crypto.getRandomValues(this.#randomBuffer)[0] & bit48Max;
	};
	cidValid (connId) {
		if ((!connId && connId != 0n) || connId.constructor != BigInt) {
			throw(new Error("Invalid connection ID."));
		};
	};
	connOpen () {
		let connId = this.getRandom();
		this.pool.push({
			cmd: 0,
			cid: connId,
			mid: 0,
			cdv: this.timeout
		});
		return connId;
	};
	connClose (connId, error = "", mid = 0) {
		this.cidValid(connId);
		this.pool.push({
			cmd: 1,
			cid: connId,
			mid,
			pdt: error
		});
	};
	connTest (connId, type = 0, mid = 0) {
		this.cidValid(connId);
		this.pool.push({
			cmd: 2,
			cid: connId,
			mid,
			cdv: type
		});
	};
	dataJump (connId, pdt, mid = 0) {
		this.cidValid(connId);
		this.pool.push({
			cmd: 3,
			cid: connId,
			mid,
			pdt
		});
	};
	dataSend (connId, pdt, mid = 0) {
		this.cidValid(connId);
		this.pool.push({
			cmd: 4,
			cid: connId,
			mid,
			pdt
		});
	};
	dataAck (connId, mid) {
		this.cidValid(connId);
		if (!mid) {
			throw(new Error("Invalid message ID"));
		};
		this.pool.push({
			cmd: 5,
			cid: connId,
			mid,
			cdv: 0
		});
	};
	featOn (connId, data = "") {
		this.cidValid(connId);
		this.pool.push({
			cmd: 6,
			cid: connId,
			mid: 0,
			pdt: data
		});
	};
	featOff (connId, data = "") {
		this.cidValid(connId);
		this.pool.push({
			cmd: 7,
			cid: connId,
			mid: 0,
			pdt: data
		});
	};
	validate (data) {
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
	finalize () {
		let proxy = [syxStart];
		let lastMid = {};
		// Encode each part.
		// Control header compile.
		this.pool.forEach((e) => {
			let cmdBuf = new Uint8Array(1);
			cmdBuf[0] = e.cmd;
			switch (e.cmd) {
				case 0: {
					lastMid[e.cid] = 1;
					proxy.push(cmdBuf);
					proxy.push(this.#vlvEnc.encodeBint(e.cid));
					proxy.push(this.#vlvEnc.encode(e.cdv));
					proxy.push(this.#vlvEnc.encode(e.mid));
					break;
				};
				case 1: {
					if (!e.mid) {
						e.mid = lastMid[e.cid];
					};
					delete lastMid[e.cid];
					proxy.push(cmdBuf);
					proxy.push(this.#vlvEnc.encodeBint(e.cid));
					e.pdt = this.validate(e.pdt);
					proxy.push(this.#vlvEnc.encode(e.pdt.length));
					proxy.push(this.#vlvEnc.encode(e.mid));
					break;
				};
				case 2:
				case 5: {
					proxy.push(cmdBuf);
					proxy.push(this.#vlvEnc.encodeBint(e.cid));
					proxy.push(this.#vlvEnc.encode(e.cdv));
					proxy.push(this.#vlvEnc.encode(e.mid));
					break;
				};
				case 3:
				case 4: {
					if (!e.mid) {
						e.mid = lastMid[e.cid];
					} else {
						lastMid[e.cid] = e.mid;
					};
					proxy.push(cmdBuf);
					proxy.push(this.#vlvEnc.encodeBint(e.cid));
					e.pdt = this.validate(e.pdt);
					proxy.push(this.#vlvEnc.encode(e.pdt.length));
					proxy.push(this.#vlvEnc.encode(e.mid));
					lastMid[e.cid] ++;
					break;
				};
				case 6:
				case 7: {
					proxy.push(cmdBuf);
					proxy.push(this.#vlvEnc.encodeBint(e.cid));
					e.pdt = this.validate(e.pdt);
					proxy.push(this.#vlvEnc.encode(e.pdt.length));
					proxy.push(this.#vlvEnc.encode(e.mid));
					break;
				};
			};
		});
		proxy.push(syxEnd);
		// Payload compile.
		this.pool.forEach((e) => {
			switch (e.cmd) {
				case 1:
				case 3:
				case 4:
				case 6:
				case 7: {
					proxy.push(e.pdt);
					break;
				};
			};
		});
		// Done.
		delete this.pool;
		this.pool = [];
		return new Blob(proxy);
	};
	constructor () {};
};

export {
	DitzyEncoder
};
