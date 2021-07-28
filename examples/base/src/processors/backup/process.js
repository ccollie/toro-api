"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process = void 0;
const dynamo_1 = require("./dynamo");
const s3_1 = require("./s3");
const process = async (job) => {
    if (job.name === 's3') {
        return s3_1.processS3(job);
    }
    else if (job.name === 'dynamo') {
        return dynamo_1.processDynamo(job);
    }
    throw new Error(`Unknown job type "${job.name}" in queue`);
};
exports.process = process;
