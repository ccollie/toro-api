--[[
  Remove jobs from the specific set by pattern.
  Input:
    KEYS[1]  set key,
    KEYS[2]  events stream key

    ARGV[1]  jobKey prefix
    ARGV[2]  pattern - see https://redis.io/commands/keys/ for supported patterns
    ARGV[3]  limit the number of jobs to be removed. 0 is unlimited
    ARGV[4]  set name, can be any of 'wait', 'active', 'paused', 'delayed', 'completed', or 'failed'

     Events:
      'removed'
]]

-- Includes
--- @include "<base>/includes/removeJob"


local rcall = redis.call

local jobKeyPrefix = ARGV[1]
local pattern = ARGV[2]
local setName = ARGV[3]  --- set name, can be any of 'wait', 'active', 'paused', 'delayed', 'completed', or 'failed'
local limit = tonumber(ARGV[4])

local rangeStart = 0
local rangeEnd = -1

-- If we're only deleting _n_ items, avoid retrieving all items
-- for faster performance
--
-- Start from the tail of the list, since that's where oldest elements
-- are generally added for FIFO lists
if limit > 0 then
  rangeStart = -1 - limit + 1
  rangeEnd = -1
end

local function isValidJob(jobKey, skipCheckLock)
  if (jobKey.match(pattern)) then
    if (skipCheckLock or rcall("EXISTS", jobKey .. ":lock") == 0) then
      return true
    end
  end
  return false
end

local function cleanList(listKey, jobKeyPrefix, rangeStart, rangeEnd, skipCheckLock)
  local jobs = rcall("LRANGE", listKey, rangeStart, rangeEnd)
  local deleted = {}
  local deletedCount = 0
  local deletionMarker = ''
  local jobIdsLen = #jobs
  for i, job in ipairs(jobs) do
    if limit > 0 and deletedCount >= limit then
      break
    end

    local jobKey = jobKeyPrefix .. job
    if (isValidJob(jobKey, skipCheckLock)) then
      -- replace the entry with a deletion marker; the actual deletion will
      -- occur at the end of the script
      rcall("LSET", listKey, rangeEnd - jobIdsLen + i, deletionMarker)
      removeJob(job, true, jobKeyPrefix)
      deletedCount = deletedCount + 1
      table.insert(deleted, job)
    end
  end

  rcall("LREM", listKey, 0, deletionMarker)

  return {deleted, deletedCount}
end

local function cleanSet(setKey, jobKeyPrefix, rangeStart, rangeEnd)
  local jobs = rcall("ZRANGE", setKey, rangeStart, rangeEnd)
  local deleted = {}
  local deletedCount = 0
  for _, job in ipairs(jobs) do
    if limit > 0 and deletedCount >= limit then
      break
    end

    local jobKey = jobKeyPrefix .. job
    if (isValidJob(jobKey, true)) then
      removeJob(job, true, jobKeyPrefix)
      deletedCount = deletedCount + 1
      table.insert(deleted, job)
    end
  end

  if(#deleted > 0) then
    for from, to in batches(#deleted, 7000) do
      rcall("ZREM", setKey, unpack(deleted, from, to))
    end
  end

  return {deleted, deletedCount}
end

local result
if setName == "active" then
  result = cleanList(KEYS[1], jobKeyPrefix, rangeStart, rangeEnd, false)
elseif setName == "delayed" then
  result = cleanSet(KEYS[1], jobKeyPrefix, rangeStart, rangeEnd)
elseif setName == "wait" or setName == "paused" then
  result = cleanList(KEYS[1], jobKeyPrefix, rangeStart, rangeEnd, true)
else
  result = cleanSet(KEYS[1], jobKeyPrefix, rangeStart, rangeEnd)
end

rcall("XADD", KEYS[2], "*", "event", "patternDeleted", "count", result[2], "pattern", pattern, "status", setName)

return result[1]
