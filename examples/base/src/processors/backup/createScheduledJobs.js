"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduledJobs = void 0;
const ms = require("ms");
function addS3BackupJob(queue) {
    return queue.add('s3', {
        bucket: 'lazer-kitties.amazonaws.com',
        queue: queue.name,
    }, {
        repeat: {
            every: ms('10 mins'),
            tz: 'Asia/Hong_Kong',
        },
    });
}
function addDynamoBackupJob(queue) {
    return queue.add('dynamo', {
        bucket: 'fungible-kneehighs.amazonaws.com',
        queue: queue.name,
    }, {
        repeat: {
            every: ms('10 mins'),
            tz: 'America/New_York',
        },
    });
}
async function createScheduledJobs(queue) {
    await addS3BackupJob(queue);
    await addDynamoBackupJob(queue);
}
exports.createScheduledJobs = createScheduledJobs;
