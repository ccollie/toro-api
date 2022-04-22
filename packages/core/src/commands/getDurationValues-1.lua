--[[
  Get values for processing time for completed tasks within a given time period.
  Input:
    KEYS[1]  Source key (completed)
    ARGV[1]  key prefix
    ARGV[2]  start ts
    ARGV[3]  end ts
    ARGV[4]  job name filter -- optional, can be nil or empty string
  Output:
    array(timestamp, processedOn, finishedOn, {...})
]]
local key = KEYS[1]
local prefix = ARGV[1]
local rangeStart = tonumber(ARGV[2], 0)
local rangeEnd = tonumber(ARGV[3], -1)
local jobNameFilter = ARGV[4]

if (jobNameFilter == '') then
  jobNameFilter = nil
end

local jobFilterFn = function(jobName)
    return true
end

if (jobNameFilter ~= nil and #jobNameFilter > 0) then
  --- determine if we have a regex-like pattern
  if (string.match(jobNameFilter, "[%*%?%[%]%-%+]")) then
    jobFilterFn = function(jobName)
      local pattern = jobNameFilter
      return jobName.match(pattern)
    end
  else
    jobFilterFn = function(jobName)
      local match = jobNameFilter
      return jobName == match
    end
  end
end

local count = 1
local result = {}

local ids = redis.call('zrangebystore', key, rangeStart, rangeEnd)
if (#ids > 0) then
  for _, id in ipairs(ids) do
    local jobKey = prefix .. id
    local job = redis.call('hmget', jobKey, 'timestamp', 'finishedOn', 'processedOn', 'name')
    local timestamp = tonumber(job[1]) or -1
    local finishedOn = tonumber(job[2]) or -1
    local processedOn = tonumber(job[3])
    local name = job[4]

    if jobFilterFn(name) and (processedOn ~= nil) then
      local count = #result;
      result[count + 1] = timestamp
      result[count + 2] = processedOn
      result[count + 3] = finishedOn
    end
  end
end

return result
