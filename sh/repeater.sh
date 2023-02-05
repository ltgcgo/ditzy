#!/bin/bash
deno run --allow-net --allow-env dist/repeater.js "${@}"
exit