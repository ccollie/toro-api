--[[
    Remove all jobs matching a given pattern from all the queues they may be in as well as all its data.
    In order to be able to remove any job, they must be unlocked.

     Input:
      KEYS[1] 'completed' key,
      KEYS[2] 'failed' key
      KEYS[3] 'delayed' key
      KEYS[4] 'active' key
      KEYS[5] 'wait' key
      KEYS[6] 'paused' key
      KEYS[7] waitChildrenKey key
      KEYS[8] event streaam key

      ARGV[1]  prefix  -- queue prefix
      ARGV[2]  pattern
      ARGV[3]  cursor
      ARGV[4]  supportsType

     Events:
      'removed'
]]

-- Includes
--- @include "<base>/includes/batches"
--- @include "<base>/includes/removeJob"
--- @include "<base>/includes/destructureJobKey"

-- TODO PUBLISH global events 'removed'

local rcall = redis.call
local jobKeyPrefix = ARGV[1]
local supportsType = tonumber(ARGV[4])

local deletedCount = 0
local removed = {}

local jobKeyMeta = {
  [KEYS[1]] = { t = 'zset', fn = removeFromSet, deleted = {} },   --- completed
  [KEYS[2]] = { t = 'zset', fn = removeFromSet, deleted = {} },   --- failed
  [KEYS[3]] = { t = 'zset', fn = removeFromSet, deleted = {} },   --- delayed
  [KEYS[4]] = { t = 'list', fn = removeFromList, deleted = {}, skipLockCheck = false },  --- active
  [KEYS[5]] = { t = 'list', fn = removeFromList, deleted = {}, skipLockCheck = true },   --- wait
  [KEYS[6]] = { t = 'list', fn = removeFromList, deleted = {}, skipLockCheck = true },   --- paused
  [KEYS[7]] = { t = 'zset', fn = removeFromSet, deleted = {} },   --- waitChildrenKey
}

local function isHash(key)
  local type = rcall('type', key)
  return type['ok'] == 'hash'
end

local function removeFromList(deleted, listKey, jobKeyPrefix, job, skipCheckLock)
  local jobKey = jobKeyPrefix .. job
  if (skipCheckLock or rcall("EXISTS", jobKey .. ":lock") == 0) then
    rcall("LREM", listKey, job)
    removeJob(job, true, jobKeyPrefix)
    table.insert(deleted, job)
  end
end

local function removeFromSet(deleted, setKey, jobKeyPrefix, job)
  removeJob(job, true, jobKeyPrefix)
  table.insert(deleted, job)
end

--- remove job ids in bulk from a set
local function cleanupZSet(setKey, deleted)
  if (#deleted > 0) then
    for from, to in batches(#deleted, 7000) do
      rcall("ZREM", setKey, unpack(deleted, from, to))
    end
  end
end

local args = {"SCAN", ARGV[3], "MATCH", ARGV[1] .. ARGV[2]}
if supportsType ~= 0 then
    args[#args+1] = "type"
    args[#args+1] = "hash"
end

local result = rcall("SCAN", ARGV[3], "MATCH", ARGV[1] .. ARGV[2])
local cursor = result[1];
local jobKeys = result[2];


local prefixLen = string.len(ARGV[1]) + 1
for _, jobKey in ipairs(jobKeys) do
  if (supportsType or isHash(jobKey)) then
    local jobId = string.sub(jobKey, prefixLen)
    -- make sure its the terminal segment, otherwise it's not a job
    -- e.g. we can have bull:send-mail:1:something-or-other

    if (string.find(jobId, ':') == nil) then
      local jobKeyPrefix = string.sub(jobKey, 1, prefixLen - 1)
      local redisKey = jobKeyPrefix  --- list or set key
      local jobKeyMeta = jobKeyMeta[redisKey]
      if (jobKeyMeta) then
        removeJob(job, true, jobKeyPrefix)
        deletedCount = deletedCount + 1

        jobKeyMeta.fn(
                jobKeyMeta.deleted,
                redisKey,
                jobKeyPrefix,
                jobId,
                jobKeyMeta.skipLockCheck
        )

        -- todo: delete keys related to rate limiter
      end
    end

  end
end

for i = 1, #KEYS - 1 do
  local key = KEYS[i]
  local meta = jobKeyMeta[key]
  local deleted = meta.deleted
  if (meta.t == 'zset') then
    cleanupZSet(key, deleted)
  end
end


local result
if ARGV[4] == "active" then
  result = cleanList(KEYS[1], ARGV[1], rangeStart, rangeEnd, ARGV[2], false)
elseif ARGV[4] == "delayed" then
  result = cleanSet(KEYS[1], ARGV[1], rangeStart, rangeEnd, ARGV[2])
elseif ARGV[4] == "wait" or ARGV[4] == "paused" then
  result = cleanList(KEYS[1], ARGV[1], rangeStart, rangeEnd, ARGV[2], true)
else
  result = cleanSet(KEYS[1], ARGV[1], rangeStart, rangeEnd, ARGV[2], {"finishedOn"} )
end

rcall("XADD", KEYS[8], "*", "event", "cleaned", "count", result[2])

return {cursor, result[1]}
