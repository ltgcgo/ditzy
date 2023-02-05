"use strict";

import {
	VLVEncoder,
	VLVDecoder
} from "../vlv/index.mjs";

let syxStart = new Uint8Array([240, 126, 127, 4, 64]),
syxEnd = new Uint8Array([247]);

let DitzyEncoder = class {
	#vlvEnc = new VLVEncoder(6);
	#vlvDec = new VLVDecoder(6);
	pool = [];
	finalize () {
		let proxy = [];
		// Encode each part.
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
