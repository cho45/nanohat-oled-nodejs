
const EventEmitter = require('events');
const {Bus, Device} = require('i2c-bus-promised');
const Canvas = require('canvas');

const {OLED} = require('./oled.js');
const {GPIOEventEmitter} = require('./gpioemitter.js');

function wait(n) { return new Promise( (r) => setTimeout(r, n)) }

const WHITE = "#ffffff";
const BLACK = "#000000";

class Screen extends EventEmitter {
	get width() { return 128; }
	get height() { return 64; }

	constructor() {
		super();
		this.canvas = new Canvas(this.width, this.height);
		this.ctx = this.canvas.getContext("2d");
		this.ctx.fillStyle = BLACK;
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.requests = [];
	}

	async init() {
		this.bus = new Bus(0);
		await this.bus.open();

		this.gpioEvent = new GPIOEventEmitter();
		const eventHandler = (e) => {
			this.emit(e.type, e, this.ctx);
		};
		this.gpioEvent.on('keydown', eventHandler);
		this.gpioEvent.on('keyup', eventHandler);

		this.oled = new OLED(this.bus);
		await this.oled.initialize();
		await this.oled.clear();
		this.emit("load", {}, this.ctx);
	}

	requestAnimationFrame(cb) {
		this.requests.push(cb);
	}

	async loop() {
		await this.init();
		let prevImageData = null;
		let lastRenderdTime = 0;
		const frames = 1000/30;
		for (;;) {
			for (let i = 0, len = this.requests.length; i < len; i++) {
				this.requests.shift()();
			}

			// render thread
			const imagedata = this.ctx.getImageData(0, 0, this.width, this.height);
			let   dirty = false;
			if (prevImageData) {
				const prev = prevImageData.data;
				const next = imagedata.data;
				const len  = next.length;
				for (let i = 0; i < len; i++) {
					if (prev[i] !== next[i]) {
						dirty = true;
						break;
					}
				}
			} else {
				dirty = true;
			}
			if (dirty) {
				await this.oled.drawImage(imagedata);
				prevImageData = imagedata;
			}
			const now = Date.now();
			const w = frames - (now - lastRenderdTime);
			if (w > 0) {
				await wait(w);
			}
			lastRenderdTime = now;
		}
	}

	clear() {
		const ctx = this.ctx;
		ctx.fillStyle = BLACK;
		ctx.fillRect(0, 0, this.width, this.height);
		ctx.fillStyle = WHITE;
	}
}
Screen.getInstance = () => {
	if (!Screen._instance) {
		Screen._instance = new Screen();
	}
	return Screen._instance;
};


this.Screen = Screen;
