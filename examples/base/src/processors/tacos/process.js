"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.process = void 0;
const ms_1 = __importDefault(require("ms"));
const latencies_1 = require("../latencies");
const options = {
    min: ms_1.default('10 secs'),
    max: ms_1.default('1.25 mins'),
    mean: ms_1.default('25 secs'),
};
function getLatency() {
    return latencies_1.gaussianBM(options.min, options.max);
}
const process = async (job) => {
    const { data } = job;
    const { queue } = data;
    const { protein, salsa, orderNumber } = data;
    const cookTime = getLatency();
    const logMsg = `queue: ${queue} #${orderNumber}: ${protein}, ${salsa} cooking for ${(cookTime / 1000).toFixed(2)}s`;
    console.log(logMsg);
    let progress = 10;
    return new Promise((resolve, reject) => {
        const update = () => {
            job.updateProgress(progress);
            return (progress += 25);
        };
        const maybeThrow = () => {
            const dice = Math.random();
            if (dice < 0.0725) {
                return reject(new Error(`taco #${job.id} burned`));
            }
        };
        const wake = () => {
            console.log(`${queue} #${orderNumber}: ${protein}, ${salsa} served`);
            resolve();
        };
        setTimeout(update, cookTime / 5);
        setTimeout(update, (cookTime / 5) * 2);
        setTimeout(update, (cookTime / 5) * 3);
        setTimeout(update, (cookTime / 5) * 4);
        setTimeout(maybeThrow, cookTime * Math.random());
        return setTimeout(wake, cookTime);
    });
};
exports.process = process;
