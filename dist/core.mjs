// src/shaper/choker.mjs
var MiniSignal = class {
  #resolved = !1;
  #data;
  #resolveHandle;
  resolve(data) {
    let upThis = this;
    upThis.resolved || (upThis.#resolved = !0, upThis.#data = data, upThis.#resolveHandle && (upThis.#resolveHandle(data), upThis.#resolveHandle = void 0));
  }
  wait() {
    let upThis = this;
    return upThis.#resolved ? new Promise((p) => {
      p(upThis.#data);
    }) : new Promise((p) => {
      upThis.#resolveHandle = p;
    });
  }
}, ChokerStream = class {
  #chunk = 256;
  #calls = 0;
  #source;
  // Stores the original source
  #reader;
  // Stores the original reader
  #sink;
  // Put the new source here
  #controller;
  // Controller of the new source
  #strategy;
  // Strategy of the new source
  #attachSignal = new MiniSignal();
  alwaysCopy = !1;
  get chunk() {
    return this.#chunk;
  }
  get sink() {
    return this.#source;
  }
  get source() {
    return this.#sink;
  }
  attach(source) {
    let upThis = this;
    upThis.#source = source, upThis.#reader = source.getReader(), upThis.#attachSignal.resolve();
  }
  constructor(maxChunkSize = 1024, alwaysCopy = !1) {
    let upThis = this;
    upThis.#chunk = maxChunkSize, upThis.alwaysCopy = alwaysCopy, upThis.#strategy = new ByteLengthQueuingStrategy({
      highWaterMark: maxChunkSize
    });
    let bufferLength = 0, buffer;
    upThis.#sink = new ReadableStream({
      cancel: async (reason) => {
        await upThis.#source.cancel(reason);
      },
      start: async (controller) => {
      },
      pull: async (controller) => {
        upThis.#calls++;
        let useCopy = !1;
        await upThis.#attachSignal.wait();
        let resume = !0, readBytes = 0;
        for (; resume && readBytes < upThis.#chunk; ) {
          let { done, value } = await upThis.#reader.read(), valueSize = value?.byteLength || 0;
          readBytes += valueSize;
          let realOffset = 0, readView, unfinished = !0;
          if (value?.byteLength)
            for (readView = new Uint8Array(value.buffer, value.byteOffset, value.byteLength); unfinished; ) {
              let commitBuffer;
              if (readView.byteLength < 1 && (unfinished = !1), bufferLength) {
                let flushBuffer = readView.subarray(0, upThis.#chunk - bufferLength);
                buffer.set(flushBuffer, bufferLength), bufferLength + flushBuffer.byteLength < upThis.#chunk ? bufferLength += readView.byteLength : (commitBuffer = buffer, bufferLength = 0, buffer = new Uint8Array(upThis.#chunk)), readView = readView.subarray(flushBuffer.byteLength);
              } else
                readView.byteLength < upThis.#chunk ? (bufferLength = readView.byteLength, buffer?.constructor != Uint8Array && (buffer = new Uint8Array(upThis.#chunk)), buffer.set(readView)) : upThis.alwaysCopy ? (commitBuffer = new Uint8Array(upThis.#chunk), commitBuffer.set(readView.subarray(0, upThis.#chunk))) : commitBuffer = readView.subarray(0, upThis.#chunk), readView = readView.subarray(upThis.#chunk);
              commitBuffer && (controller.enqueue(new Uint8Array(commitBuffer)), realOffset += commitBuffer?.byteLength);
            }
          done && (bufferLength && controller.enqueue(buffer.subarray(0, bufferLength)), controller.close(), resume = !1);
        }
      }
    }, this.#strategy);
  }
}, choker_default = ChokerStream;

// src/vlv/index.mjs
var bitLength = function(bint) {
  let len = 0n;
  for (; bint > 0; )
    bint = bint >> 1n, len++;
  return len - 1n;
}, VLVDecoder = class {
  bits = 7;
  #value = 0;
  #vbint = 0n;
  decode(byte) {
    if (this.bits > 7 && (this.bits = 7), byte < 0)
      throw RangeError("Cannot be negative values");
    let bitLimit = (1 << this.bits) - 1;
    if (this.#value = this.#value << this.bits, byte >= bitLimit)
      return this.#value += byte & bitLimit, null;
    {
      let resp = this.#value + byte;
      return this.#value = 0, resp;
    }
  }
  decodeBint(bytes) {
    if (this.bits > 7 && (this.bits = 7), bytes < 0)
      throw RangeError("Cannot be negative values");
    let bits = BigInt(this.bits), byte = BigInt(bytes), bitLimit = (1n << bits) - 1n;
    if (this.#vbint = this.#vbint << bits, byte >= bitLimit)
      return this.#vbint += byte & bitLimit, null;
    {
      let resp = this.#vbint + byte;
      return this.#vbint = 0n, resp;
    }
  }
  constructor(bitLen) {
    this.bits = bitLen || 7;
  }
}, VLVEncoder = class {
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

// src/core/index.mjs
var utf8Encode = new TextEncoder(), utf8Decode = new TextDecoder("utf-8", { fatal: !0 }), vlvDecode = new VLVDecoder(), vlvEncode = new VLVEncoder(), byteIterator = new BigUint64Array(1), DitzyHTTP = class extends EventTarget {
  CONNECTING = 0;
  // Queue data
  OPEN = 1;
  // Send and queue data
  CLOSING = 2;
  // Rejects sending
  CLOSED = 3;
  // Rejects sending
  PROFILE_REALTIME = {
    realtime: !0,
    maxTime: 10,
    chunk: 1,
    maxSize: 1 / 0
  };
  // Just send the fuck out as soon as there are something. High priority.
  PROFILE_BALANCED = {
    maxTime: 100,
    chunk: 65536,
    maxSize: 1048576
  };
  // The default Meek behaviour. 100ms maxTime, 65536 choking, 1048576 maxSize. Automatic priority.
  PROFILE_BUNDLED = {
    maxTime: 250,
    chunk: 262144,
    maxSize: 4194304
  };
  // 250ms maxTime, 262144 choking, 4194304 maxSize. Automatic priority.
  #url;
  #sse;
  // Arbitrary server-sent events. WIP
  #timeSync = !1;
  // Time Sync extension. WIP
  #realtime;
  #maxTime;
  #maxSize;
  #chunk;
  // Normalized chunk size in the choker
  #headers;
  #redirect;
  #readyState = 0;
  #dataQueue = [];
  #sendLock = !1;
  #sentSize = 0;
  #activeRequest;
  #connId;
  // 0 ~ 2^48 - 1
  #frameId = 0;
  binaryType = "text";
  // "text" (UTF-8) or "binary" (Uint8Array). "text" will return String if UTF-8 decoding succeeds, or else directly Uint8Array.
  get readyState() {
    return this.#readyState;
  }
  get url() {
    return this.#url;
  }
  get bufferedAmount() {
    return 0;
  }
  async #swapRequest() {
    let upThis = this;
    if (upThis.#activeRequest)
      console.debug("SWAP_ERROR_CONFLICT");
    else {
      upThis.#scheduleData([2, new Uint8Array(1)]);
      let originSource = new ReadableStream({
        start: (controller) => {
          console.debug("SEND_LOCK_ENABLE"), upThis.#sendLock = !0, setTimeout(() => {
            controller.close(), upThis.#activeRequest = null, upThis.#sendLock = !0, console.debug("DATA_SEND_CLOSE");
          }, upThis.#maxTime);
        },
        pull: async (controller) => {
          if (upThis.#dataQueue.length) {
            let target = upThis.#dataQueue.shift();
            console.debug(`DATA_SEND_QUEUE: ${target.byteLength} B`), controller.enqueue(target);
          } else
            console.debug("SEND_LOCK_DISABLE"), upThis.#sendLock = !1;
        }
      }), chokedSource = new choker_default(upThis.#chunk), signal, sendFunc = async () => {
        signal = AbortSignal.timeout(1e4), signal.addEventListener("timeout", () => {
          upThis.close("SEND_FAIL_TIMEOUT");
        }), upThis.#readyState = 1;
        let response;
        try {
          response = await fetch(upThis.#url, {
            method: "post",
            headers: upThis.#headers,
            body: chokedSource.source,
            redirect: upThis.#redirect || "follow",
            keepalive: !0,
            priority: upThis.#realtime ? "high" : "auto",
            signal
          }), console.debug(`RECV_STATUS: ${response.status}`);
        } catch (err) {
          upThis.close(`SEND_FAIL_ERROR: ${err}
${err.stack}`);
        }
      };
      chokedSource.attach(originSource), await sendFunc(), upThis.#dataQueue.length ? setTimeout(() => {
        upThis.#swapRequest();
      }, 1) : setTimeout(() => {
        upThis.#swapRequest();
      }, 2e3);
    }
  }
  #encodeData(dataElement) {
    let upThis = this, [type, payload] = dataElement, frame = vlvEncode.encode(upThis.#frameId), dataSize = vlvEncode.encode(payload.byteLength), size = 1 + upThis.#connId.byteLength + frame.byteLength + dataSize.byteLength + payload.byteLength;
    console.debug(`DATA_ENCODE: ${upThis.#frameId} ${type} ${payload.byteLength}(${size})`);
    let buffer = new Uint8Array(size), pointer = 1;
    return buffer[0] = type, buffer.set(pointer, upThis.#connId), pointer += upThis.#connId.byteLength, buffer.set(pointer, frame), pointer += frame.byteLength, buffer.set(pointer, dataSize), pointer += dataSize.byteLength, buffer.set(pointer, payload), buffer;
  }
  #trueClose(payload) {
    console.debug("CONN_CLOSED"), this.#readyState = this.CLOSED;
  }
  #scheduleData(data) {
    let upThis = this;
    upThis.#activeRequest && !upThis.#sendLock ? (upThis.#activeRequest.enqueue(upThis.#encodeData(data)), console.debug(`DATA_SEND_DIRECT: ${upThis.#frameId}`)) : (upThis.#dataQueue.push(upThis.#encodeData(data)), console.debug(`DATA_QUEUE: ${upThis.#frameId}`)), upThis.#frameId++;
  }
  close(payload = "NO_ERROR") {
    this.#scheduleData([0, utf8Encode.encode(payload)]), this.#readyState = this.CLOSING, console.debug(`CONN_CLOSE: ${payload}`), this.dispatchEvent(new CloseEvent("close", {
      reason: payload
    }));
  }
  send(data) {
    if (this.#readyState >> 1)
      throw new Error("Cannot send data through a closed connection.");
    switch (data.constructor) {
      case Uint8Array:
        break;
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
      }
      case Blob:
        throw new TypeError("Blobs cannot be sent via Ditzy directly. Read as ArrayBuffer first.");
      case String: {
        data = utf8Encode.encode(data);
        break;
      }
      default:
        throw new TypeError("Unrecognized data.");
    }
    this.#scheduleData([4, data]);
  }
  constructor(url = "", options = {}) {
    super();
    let upThis = this, { headers, redirect, profile, timeSync } = options;
    profile || (profile = upThis.PROFILE_BALANCED), upThis.#headers = headers, upThis.#redirect = redirect, upThis.#timeSync = timeSync, upThis.#realtime = profile.realtime, upThis.#chunk = profile.chunk, upThis.#maxTime = profile.maxTime, upThis.#maxSize = profile.maxSize, upThis.#url = url, crypto.getRandomValues(byteIterator), upThis.#connId = vlvEncode.encodeBint(byteIterator[0]), upThis.#scheduleData([1, vlvEncode.encode(1023)]), upThis.#swapRequest();
  }
};
export {
  DitzyHTTP
};
