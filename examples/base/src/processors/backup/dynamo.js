"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDynamo = void 0;
const ms = require("ms");
const utils_1 = require("../utils");
const TABLES = [
    'teams',
    'loot',
    'chat-history',
    'leaderboard',
    'audit',
    'orders',
    'users',
    'transactions',
];
const processDynamo = async (job) => {
    const { data } = job;
    const { queue, bucket } = data;
    const logMsg = `${queue || 'backup'}: backing up dynamoDb tables to s3 bucket ${bucket}`;
    console.log(logMsg);
    const update = async (progress, msg) => {
        await job.updateProgress(progress);
        await job.log(msg);
    };
    function getBackupFilename(tableName) {
        const datestamp = utils_1.getTimestampString();
        return `${tableName}-${datestamp}.tgz`;
    }
    const maybeThrow = function (message) {
        const dice = Math.random();
        if (dice < 0.2) {
            throw new Error(message);
        }
    };
    const totalCount = Math.floor(utils_1.rand(50, 10000)) * 1000;
    const sizeDistributions = utils_1.getRandDistArray(TABLES.length, totalCount);
    const maxTime = (totalCount / 1000) * utils_1.rand(250, 2000);
    const done = () => {
        console.log(`${queue} : dynamo backup to ${bucket} done ${totalCount} records copied.`);
    };
    let sum = 0;
    for (let i = 0, len = TABLES.length; i < len; i++) {
        const table = TABLES[i];
        const count = sizeDistributions[i];
        const compressedName = getBackupFilename(table);
        const time = Math.floor((count / totalCount) * maxTime);
        maybeThrow(`Error copying table ${table} to ${bucket}`);
        await utils_1.sleep(time);
        const countStr = utils_1.formatBytes(count);
        sum = sum + count;
        const progress = Math.floor(sum / totalCount);
        const msg = `copied ${countStr} records from ${table} to ${compressedName} in ${ms(time)}`;
        await update(progress, msg);
    }
    done();
};
exports.processDynamo = processDynamo;
