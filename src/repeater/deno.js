"use strict";

import {WingBlade} from "../../libs/wingblade/deno.mjs";

WingBlade.web.serve(async (req) => {
	if (req.headers.has("upgrade")) {
		let {socket, response} = WingBlade.web.acceptWs(req);
		socket.addEventListener("open", async (ev) => {
			console.debug(`WS open.`);
			socket.send(JSON.stringify((new Date()).toJSON()));
		});
		socket.addEventListener("message", async (ev) => {
			socket.send(ev.data);
		});
		socket.addEventListener("close", async (ev) => {
			console.debug(`WS close.`)
		});
		socket.addEventListener("error", async (ev) => {
			console.debug(`WS error:`);
			console.debug(ev);
		});
		return response;
	} else {
		return new Response("Not WebSocket!");
	};
}, {
	hostname: "127.0.0.1",
	port: 19810
});
