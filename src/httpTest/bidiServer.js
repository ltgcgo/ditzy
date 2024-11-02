"use strict";

const u8Enc = new TextEncoder();
const connectBanner = u8Enc.encode("Server accepted!\n");
const stdoutWriter = Deno.stdout.writable.getWriter();

let streamHandler = async (ingress) => {
	let egressController;
	let egress = new ReadableStream({
		"start": async (controller) => {
			egressController = controller;
			controller.enqueue(connectBanner);
		}/*,
		"pull": (controller) => {
			return Promise()
		}*/
	});
	let ingressReader = ingress.getReader();
	(async () => {
		let isAlive = true;
		while (isAlive) {
			let {done, value} = await ingressReader.read();
			isAlive = !done;
			if (value) {
				await stdoutWriter.ready;
				stdoutWriter.write(value);
			};
		};
	})();
	(async () => {
		await ingress.closed;
		egressController.close();
	})();
	return egress;
};

let httpServer = Deno.serve({
	"transport": "tcp",
	"port": 9030,
	"hostname": "127.0.3.1"
}, async (req, info) => {
	//console.debug(req);
	let remoteInfo = info.remoteAddr;
	switch (remoteInfo.transport) {
		case "tcp":
		case "udp": {
			if (remoteInfo.hostname.indexOf(".") == -1) {
				console.debug(`\nRequest sent via ${remoteInfo.transport} [${remoteInfo.hostname}]:${remoteInfo.port}`);
			} else {
				console.debug(`\nRequest sent via ${remoteInfo.transport} ${remoteInfo.hostname}:${remoteInfo.port}`);
			};
			break;
		};
		case "unix":
		case "unixpacket": {
			console.debug(`\nRequest sent via ${remoteInfo.transport} ${remoteInfo.path}`);
			break;
		};
		default: {
			console.debug(`\nUnknown transport type: "${remoteInfo.transport}"`);
		};
	};
	(async () => {
		console.debug(`Waiting for stream end...`);
		await info.completed;
		console.debug(`\nRequest stream ended.`);
	})();
	return new Response(await streamHandler(req.body), {
		"status": 200,
		"headers": {
			"X-Accel-Buffering": "no",
			"Cache-Control": "no-store, no-transform",
			"Content-Type": "text/event-stream"
		}
	});
	/* return new Response("Horny dee", {
		"status": 200
	}); */
});
