"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processS3 = void 0;
const ms_1 = __importDefault(require("ms"));
const lodash_1 = require("lodash");
const utils_1 = require("../utils");
const FILENAMES = [
    'kute-kats.txt',
    'secret-codez.php',
    'master-passwords.txt',
    'client-logs.log',
    'latency-stats.mst',
    'client-stack-trace',
    'transaction-uploads.txt',
];
const ONE_MEG = 1024 * 1000;
function rand(min, max) {
    return Math.random() * (max - min) + min;
}
const processS3 = async (job) => {
    const { data } = job;
    const { queue, bucket } = data;
    const logMsg = `${queue || 'backup'}: backing up s3 bucket ${bucket}`;
    console.log(logMsg);
    const update = async (progress, msg) => {
        await job.updateProgress(progress);
        await job.log(msg);
    };
    function fixFilename(filename, ext) {
        const [name, origExt] = filename.split('.');
        const newExt = ext || origExt;
        const suffix = newExt && newExt.length ? `.${newExt}` : '';
        const datestamp = utils_1.getTimestampString();
        return `${name}-${datestamp}${suffix}`;
    }
    const maybeThrow = (message) => {
        const dice = Math.random();
        if (dice < 0.2) {
            throw new Error(message);
        }
    };
    const done = function () {
        console.log(`${queue} : backup ${bucket} done.`);
    };
    const totalSize = rand(50, 100) * ONE_MEG;
    // between 250ms and 1 sec
    const maxCompressionTime = (totalSize / ONE_MEG) * rand(250, 1000);
    const sizeDistributions = utils_1.getRandDistArray(FILENAMES.length, totalSize);
    // calculated compressed sizes
    const compressedSizes = [];
    let totalCompressedSize = 0;
    for (let i = 0; i < sizeDistributions.length; i++) {
        const compressedSize = Math.floor(rand(0.2, 0.75) * sizeDistributions[i]);
        totalCompressedSize += compressedSize;
        compressedSizes.push(compressedSize);
    }
    let sum = 0;
    for (let i = 0, len = FILENAMES.length; i < len; i++) {
        const filename = FILENAMES[i];
        const origSize = sizeDistributions[i];
        const compressedName = fixFilename(filename, 'tgz');
        const compressedSize = compressedSizes[i];
        const time = Math.floor((origSize / totalSize) * maxCompressionTime);
        maybeThrow(`Error compressing ${filename} to ${compressedName}`);
        await utils_1.sleep(time);
        const origSizeStr = utils_1.formatBytes(origSize);
        const compressedSizeStr = utils_1.formatBytes(compressedSize);
        const percentage = lodash_1.round(compressedSize / origSize, 1);
        sum = sum + origSize;
        const progress = Math.floor(sum / totalSize);
        // eslint-disable-next-line max-len
        let msg = `compressed ${filename} ${percentage}% to ${compressedName} (${origSizeStr} => ${compressedSizeStr})`;
        msg = msg + ` in ${ms_1.default(time)}`;
        await update(progress, msg);
    }
    done();
};
exports.processS3 = processS3;
