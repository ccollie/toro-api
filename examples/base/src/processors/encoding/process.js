"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const ONE_MILLION = 1000000;
function sizeToMs(size, mult) {
    let temp = Math.floor(size / ONE_MILLION);
    if (temp < 1000) {
        temp = temp * 5;
    }
    return temp * utils_1.rand(1, mult);
}
function calcTimeout(job, file, stage) {
    const { size } = file;
    switch (stage) {
        case 'download':
            return sizeToMs(size, 4);
        case 'upload':
            return sizeToMs(size, 4);
        case 'transcode':
            return sizeToMs(size, 15);
        case 'metadata':
            return sizeToMs(size, 4);
    }
    return utils_1.rand(100, 5000);
}
async function process(job) {
    const { data } = job;
    const { orderNumber, filename, queue, stage } = data;
    const progress = 0;
    console.log(`Beginning ${stage} (${filename})...`);
    const timeout = calcTimeout(job, data, stage);
    const update = () => job.updateProgress(progress);
    for (let i = 0; i < timeout; i++) {
        await utils_1.sleep(500);
        if (Math.random() < 0.2) {
            throw new Error(`Error processing file ${filename} ...`);
        }
        await update();
    }
    console.log(`${queue} #${orderNumber}: ${stage} ${filename} done.`);
}
