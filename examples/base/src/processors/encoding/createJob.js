"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJob = void 0;
const utils_1 = require("../utils");
const lodash_1 = require("lodash");
const utils_2 = require("./utils");
const log = console.log.bind(console);
const EXTS = ['.wmv', '.mpg', '.mpeg'];
function generateFileName(length = 15) {
    return utils_1.getRandomString(length) + lodash_1.sample(EXTS);
}
function createData() {
    return {
        filename: generateFileName(),
        destination: generateFileName(),
        size: lodash_1.random(100, 400) * 1000000,
        stage: utils_2.STAGES[0],
    };
}
function createJob(queue, orderNumber) {
    orderNumber = orderNumber || utils_1.getOrderNumber();
    const data = createData();
    log(`${queue.name}: Transcoding #${orderNumber} ${data['filename']}`);
    return queue.add(data['stage'], { ...data, orderNumber, queue: queue.name });
}
exports.createJob = createJob;
