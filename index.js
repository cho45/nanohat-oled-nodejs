//#!/usr/bin/env node

const { Screen } = require('./screen.js');
const BDFFont = require('bdf-canvas').BDFFont;
const strftime = require('strftime');
const fs_ = require('fs');
const fs = fs_.promises;
fs.createWriteStream = fs_.createWriteStream;
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const screen = Screen.getInstance();


function convertToBinary(ctx, x, y, w, h) {
	const imagedata = ctx.getImageData(x, y, w, h);
	const data = imagedata.data;
	// Conver to grayscale (use RED position for retaining pixel)
	for (let x = 0, xm = imagedata.width; x < xm; x++) {
		for (let y = 0, ym = imagedata.height; y < ym; y++) {
			const i = (y * xm + x) * 4;
			const r = data[i+0];
			const g = data[i+1];
			const b = data[i+2];
			const gray = 0.3 * r + 0.59 * g + 0.11 * b;
			data[i+0] = gray;
		}
	}
	// Floyd-Steinberg dithering
	let error = 0;
	const f7 = 7/16, f3 = 3/16, f5 = 5/16, f1 = 1/16;
	for (let y = 0, ym = imagedata.height; y < ym; y++) {
		for (let x = 0, xm = imagedata.width; x < xm; x++) {
			const i = (y * xm + x) * 4;
			const gray = data[i+0]; // get gray data from RED position (see above)
			const val  = gray < 127 ? 0 : 255; // quantize to binary
			data[i+0] = val;
			data[i+1] = val;
			data[i+2] = val;
			error = gray - val;
			data[((y+0) * xm + (x+1)) * 4] += f7 * error;
			data[((y+1) * xm + (x-1)) * 4] += f3 * error;
			data[((y+1) * xm + (x+0)) * 4] += f5 * error;
			data[((y+1) * xm + (x+1)) * 4] += f1 * error;
		}
	}
	return imagedata;
}

async function loadImage(path) {
	return await new Promise( async (resolve, reject) => {
		const img = new Canvas.Image();
		img.onload = () => { resolve(img) };
		img.onerror = reject;
		img.src = await fs.readFile(path, null);
	});
}

(async () => {
	const font = new BDFFont(await fs.readFile("./mplus_f10r.bdf", "utf-8"));
	const lines = [];
	const lineHeight = 12;
	function print(str) {
		lines.push(String(str));
		while (lines.length > 5) lines.shift();

		screen.clear();
		for (let i = 0; i < lines.length; i++) {
			font.drawText(screen.ctx, lines[i], 1, lineHeight*(i+1)-2);
		}
	}

	screen.on('load', async (e, ctx) => {
		console.log('load');
		screen.clear();

		/*
		print("init");
		for (let i = 0; i < 10; i++) {
			print(".....................")
			await wait(100);
		}

		await wait(3000);
		*/

		screen.clear();
		font.drawText(ctx, "init", 65, lineHeight*1-2);
//		const img = await loadImage("./foo.jpg");
//		ctx.drawImage(img, 0, 0, 64, 64);
//		const id = convertToBinary(ctx, 0, 0, 64, 64);
//		ctx.putImageData(id, 0, 0);

		setInterval(async () => {
			const { stdout, stderr } = await exec('ip route get 8.8.8.8');
			const ipAddress = stdout.split(/\s+/)[6];
			const now = new Date();
			screen.clear();
			font.drawText(screen.ctx, `adr: ${ipAddress}`, 1, lineHeight*(1)-2);
			font.drawText(screen.ctx, strftime("%Y-%m-%d %H:%M:%S", new Date()), 1, lineHeight*(2)-2);
		}, 1000);
	});

	let i = 0;
	screen.on('keydown', (e, ctx) => {
		console.log(e);
		print(`${i++} ${e.key} ${e.type}`);
	});

	screen.on('keyup', (e, ctx) => {
		console.log(e);
		print(`${i++} ${e.key} ${e.type}`);
	});

})();
screen.loop();
