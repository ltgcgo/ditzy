"use strict";

class VLVDecoder {
	bits = 7;
	#value = 0;
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
	constructor (bitLen) {
		this.bits = bitLen || 7;
	};
};

class VLVEncoder {
	bits = 7;
	encode (integer) {
		if (this.bits > 7) {
			this.bits = 7;
		};
		if (integer < 0) {
			throw RangeError("Cannot be negative values");
		};
		let bitLimit = (1 << this.bits) - 1,
		byteSeq = new Uint8Array(Math.floor(Math.log2(integer) / 7 + 1));
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
	constructor (bitLen) {
		this.bits = bitLen || 7;
	};
};

export {
	VLVEncoder,
	VLVDecoder
};
