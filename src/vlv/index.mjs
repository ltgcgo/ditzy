"use strict";

let bitLength = function (bint) {
	let len = 0n;
	while (bint > 0) {
		bint = bint >> 1n;
		len ++;
	};
	return len - 1n;
};

let VLVDecoder = class {
	bits = 7;
	#value = 0;
	#vbint = 0n;
	decode (byte) {
		if (this.bits > 7) {
			this.bits = 7;
		};
		if (byte < 0) {
			throw RangeError("Cannot be negative values");
		};
		let bitLimit = (1 << this.bits) - 1;
		this.#value = this.#value << this.bits;
		if (byte >= bitLimit) {
			this.#value += byte & bitLimit;
			return null;
		} else {
			let resp = this.#value + byte;
			this.#value = 0;
			return resp;
		};
	};
	decodeBint (bytes) {
		if (this.bits > 7) {
			this.bits = 7;
		};
		if (bytes < 0) {
			throw RangeError("Cannot be negative values");
		};
		let bits = BigInt(this.bits),
		byte = BigInt(bytes);
		let bitLimit = (1n << bits) - 1n;
		this.#vbint = this.#vbint << bits;
		if (byte >= bitLimit) {
			this.#vbint += byte & bitLimit;
			return null;
		} else {
			let resp = this.#vbint + byte;
			this.#vbint = 0n;
			return resp;
		};
	};
	constructor (bitLen) {
		this.bits = bitLen || 7;
	};
};

let VLVEncoder = class {
	bits = 7;
	encode (integer) {
		if (this.bits > 7) {
			this.bits = 7;
		};
		if (integer < 0) {
			throw RangeError("Cannot be negative values");
		};
		let bitLimit = (1 << this.bits) - 1,
		byteSeq = new Uint8Array(Math.max(Math.floor(Math.log2(integer) / this.bits + 1), 1));
		for (let shift = 0; shift < byteSeq.length; shift ++) {
			let target = byteSeq.length - 1 - shift,
			baseVal = bitLimit + 1;
			if (shift == 0) {
				baseVal = 0;
			};
			byteSeq[target] = baseVal + (integer >> (shift * this.bits) & bitLimit);
		};
		return byteSeq;
	};
	encodeBint (integer) {
		if (this.bits > 7) {
			this.bits = 7;
		};
		if (integer < 0n) {
			throw RangeError("Cannot be negative values");
		};
		let bits = BigInt(this.bits);
		let bitLimit = (1n << bits) - 1n,
		bitLim = Number(bitLimit),
		byteLen = bitLength(integer) / bits + 1n,
		byteSeq = new Uint8Array(Number(byteLen));
		for (let shift = 0n; shift < byteLen; shift ++) {
			let target = Number(byteLen - 1n - shift),
			baseVal = bitLim + 1;
			if (shift == 0) {
				baseVal = 0;
			};
			byteSeq[target] = baseVal + Number(integer >> (shift * bits) & bitLimit);
		};
		return byteSeq;
	};
	constructor (bitLen) {
		this.bits = bitLen || 7;
	};
};

export {
	VLVEncoder,
	VLVDecoder
};
