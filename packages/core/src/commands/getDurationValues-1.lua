--[[
  Get values for processing time for completed tasks within a given time period.
  Input:
    KEYS[1]  Source key (completed)
    ARGV[1]  key prefix
    ARGV[2]  start ts
    ARGV[3]  end ts
    ARGV[4]  job name filter -- optional, can be nil or empty string
  Output:
    array(number)
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
    local timestamp = tonumber(job[1])
    local finishedOn = tonumber(job[2])
    local processedOn = tonumber(job[3])
    local name = job[4]

    if jobFilterFn(name) and (processedOn ~= nil) then
      local duration = -1 -- default to -1 if we don't have a finishedOn value
      local waitTime = -1
      if (finishedOn ~= nil) then
        duration = finishedOn - processedOn
      end
      if (timestamp ~= nil) then
        waitTime = processedOn - timestamp
      end
      result[count] = duration
      result[count + 1] = waitTime
      count = count + 2
    end
  end
end

return result
