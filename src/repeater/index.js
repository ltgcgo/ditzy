"use strict";

// A repeater for Deno, testing whether bidirectional data delivery works.

let serveOpt = {
	port: 8002
};
if (eG("LISTEN_PORT")) {
	serveOpt.port = parseInt(eG("LISTEN_PORT"));
};

let handler = async function (request, connInfo) {
	if (request.headers?.has("Upgrade")) {
		const {socket, response} = Deno.upgradeWebSocket(request);
		socket.binaryType = "arraybuffer";
		socket.addEventListener("open", () => {
			console.info(`Repeater connected.`);
		});
		socket.addEventListener("message", (msg) => {
			socket.send(msg.data);
			console.info(`Repeated ${msg.data.length} bytes.`);
		});
		socket.addEventListener("close", () => {
			console.info(`Repeater closed.`);
		});
		return response;
	} else {
		return new Response(`<!DOCTYPE html><head><style>html{background:#000}</style><script>self.ws=new WebSocket("ws://127.0.0.1:${serveOpt.port}");ws.addEventListener("close",()=>{setTimeout(()=>{location.reload()},4000)})</script></head><body></body>`, {
				headers: {
					"content-type": "text/html"
				}, status: 200
			}
		);
	};
};

serve(handler, serveOpt);
