const sizeMultiplier = 50; // Multiplier for the size of the coins
const size = 100 * 0.4 / sizeMultiplier;

const WIDTH = 1920;
const HEIGHT = 1080;

const offsetX = WIDTH / 2;
const offsetY = HEIGHT;

export class Coin {
    public x: number;
    public y: number;

    public rot: number;

    public vx: number;
    public vy: number;

    constructor(x: number, y: number, vx: number, vy: number, rot: number) {
        this.x = x;
        this.y = y;

        this.vx = vx;
        this.vy = vy;

        this.rot = rot;
        Coin.getCoin();
    }

    public static create() {
        const x = Math.random() * (WIDTH - 200) + 100 - offsetX;
        const y = Math.random() * (500) + offsetY;

        const vx = Math.random() * 10 - 5;
        const vy = Math.random() * 10 - 5;

        const rot = Math.random() * 2 * Math.PI;
        return new Coin(x / sizeMultiplier, y / sizeMultiplier, vx, vy, rot);
    }

    public calculate(delta: number) {
        const g = 9.82; // Gravity
        const dt = delta; // Time since last frame

        this.vy = this.vy - g * dt;

        this.x = this.x + this.vx * dt;
        this.y = this.y + this.vy * dt;

        if (this.x - size / 2 <= -offsetX / sizeMultiplier) { // If the coin is outside the canvas (left)
            this.x = -offsetX / sizeMultiplier + size / 2;
            this.vx = -this.vx * 0.4;
        }

        if (this.x + size / 2 >= offsetX / sizeMultiplier) { // If the coin is outside the canvas (right)
            this.x = offsetX / sizeMultiplier - size / 2;
            this.vx = -this.vx * 0.4;
        }
    }

    private static coin: HTMLImageElement;
    private static getCoin() {
        if (this.coin) return;
        this.coin = new Image();
        this.coin.src = "/images/coin.png";
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x * sizeMultiplier + offsetX, -this.y * sizeMultiplier + offsetY);
        ctx.rotate(this.rot);
        ctx.scale(0.4, 0.4);
        ctx.drawImage(Coin.coin, -Coin.coin.width / 2, -Coin.coin.height / 2);
        ctx.restore();
    }
}

export class InsamlingCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private coins: Coin[] = [];
    public constructor() {
        if (typeof window !== 'undefined') this.loop();
    }

    public setCanvas(canvas: HTMLCanvasElement) {
        if (this.canvas === canvas) return;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.canvas.width = 1920;
        this.canvas.height = 1080;
    }

    public clearCoins() {
        this.coins.length = 0;
    }

    public fillCoins() {
        for (let i = 0; i < 150; i++)
            this.coins.push(Coin.create());
    }

    public calculate() {
        if (this.delta > 0.2) {
            this.delta /= 2;
            this.calculate();
            this.calculate();
            return;
        }

        for (const coin of this.coins)
            coin.calculate(this.delta);

        // Remove coins that are outside the canvas
        this.coins = this.coins.filter((c) => c.y + size / 2 > 0);
    }

    private renderPadding() {
        const PADDING = 150;

        this.ctx.strokeStyle = "white";
        this.ctx.beginPath();
        this.ctx.moveTo(PADDING, HEIGHT - PADDING);
        this.ctx.lineTo(WIDTH - PADDING, HEIGHT - PADDING);
        this.ctx.stroke();
    }

    public render() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, WIDTH, HEIGHT);
        for (const coin of this.coins)
            coin.render(this.ctx);

        this.renderPadding();
    }

    private lastRender = Date.now();
    private delta = 1;
    public loop() {
        this.delta = (Date.now() - this.lastRender) / 1000;

        this.calculate();
        this.render();

        // refreshDiagram();

        this.lastRender = Date.now();
        requestAnimationFrame(() => this.loop());
    }
}