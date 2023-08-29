// src/vlv/index.mjs
var bitLength = function(bint) {
  let len = 0n;
  for (; bint > 0; )
    bint = bint >> 1n, len++;
  return len - 1n;
};
var VLVEncoder = class {
  bits = 7;
  encode(integer) {
    if (this.bits > 7 && (this.bits = 7), integer < 0)
      throw RangeError("Cannot be negative values");
    let bitLimit = (1 << this.bits) - 1, byteSeq = new Uint8Array(Math.max(Math.floor(Math.log2(integer) / this.bits + 1), 1));
    for (let shift = 0; shift < byteSeq.length; shift++) {
      let target = byteSeq.length - 1 - shift, baseVal = bitLimit + 1;
      shift == 0 && (baseVal = 0), byteSeq[target] = baseVal + (integer >> shift * this.bits & bitLimit);
    }
    return byteSeq;
  }
  encodeBint(integer) {
    if (this.bits > 7 && (this.bits = 7), integer < 0n)
      throw RangeError("Cannot be negative values");
    let bits = BigInt(this.bits), bitLimit = (1n << bits) - 1n, bitLim = Number(bitLimit), byteLen = bitLength(integer) / bits + 1n, byteSeq = new Uint8Array(Number(byteLen));
    for (let shift = 0n; shift < byteLen; shift++) {
      let target = Number(byteLen - 1n - shift), baseVal = bitLim + 1;
      shift == 0 && (baseVal = 0), byteSeq[target] = baseVal + Number(integer >> shift * bits & bitLimit);
    }
    return byteSeq;
  }
  constructor(bitLen) {
    this.bits = bitLen || 7;
  }
};

// src/binenc/index.mjs
var bit48Max = (1n << 48n) - 1n, unicode = new TextEncoder(), DitzyEncoder = class {
  #vlvEnc = new VLVEncoder(6);
  #randomBuffer = new BigUint64Array(1);
  timeout = 15e3;
  pool = [];
  getRandom() {
    return crypto.getRandomValues(this.#randomBuffer)[0] & bit48Max;
  }
  cidValid(connId) {
    if (!connId && connId != 0n || connId.constructor != BigInt || connId >= bit48Max)
      throw new Error("Invalid connection ID.");
  }
  connOpen() {
    let connId = this.getRandom();
    return this.pool.push({
      cmd: 1,
      conn: connId,
      frame: 0,
      data: `{"to":${this.timeout}}`
    }), connId;
  }
  connClose(connId) {
    this.cidValid(connId), this.pool.push({
      cmd: 0,
      conn: connId,
      frame
    });
  }
  validate(data) {
    if (data.buffer)
      return data;
    switch (data.constructor) {
      case ArrayBuffer:
        return data;
      case String:
        return unicode.encode(data);
      case Number:
        return this.#vlvEnc.encode(data);
      case BigInt:
        return this.#vlvEnc.encodeBint(data);
      default:
        return unicode.encode(JSON.stringify(data));
    }
  }
  finalize() {
    let proxy = [], lastfid = {};
    return this.pool.forEach((e) => {
      let cmdBuf = new Uint8Array(1);
      cmdBuf[0] = e.cmd;
    }), delete this.pool, this.pool = [], new Blob(proxy);
  }
  constructor() {
  }
}, DitzyDecoder = class extends EventTarget {
  decode(stream) {
  }
  constructor() {
    super();
  }
};
export {
  DitzyDecoder,
  DitzyEncoder
};
