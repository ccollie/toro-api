--[[
  Get values for attemptsMade for completed tasks within a given time period.
  Input:
    KEYS[1]  Source key (completed/failed)
    ARGV[1]  key prefix
    ARGV[2]  start ts
    ARGV[3]  end ts
    ARGV[4]  job name filter -- optional, can be nil or empty string
    ARGV[5]  aggregator - 'sum' | 'avg' | 'max' | 'min'
  Output:
    array(timestamp, processedOn, finishedOn, {...})
]]
local key = KEYS[1]
local prefix = ARGV[1]
local rangeStart = tonumber(ARGV[2], 0)
local rangeEnd = tonumber(ARGV[3], -1)
local jobNameFilter = ARGV[4]
local aggregator = ARGV[5] or 'sum'

if (jobNameFilter == '') then
  jobNameFilter = nil
end

local jobFilterFn = function(jobName)
    return true
end

local aggregators = {
  sum = {
    init = function(context) 
      context = context or {}
      context.value = 0
    end,
    reduce = function(context, value) 
      context.value = context.value + value
    end,
    finish = function(context) 
      return context.value
    end
  },
  min = {
    init = function(context)
      context = context or {}
      context.value = math.huge
    end,
    reduce = function(context, value)
      context.value = math.min(context.value, value)
    end,
    finish = function(context)
      return context.value
    end
  },
  max = {
    init = function(context)
      context = context or {}
      context.value = -math.huge
    end,
    reduce = function(context, value)
      context.value = math.max(context.value, value)
    end,
    finish = function(context)
      return context.value
    end
  },
  avg = {
    init = function(context)
      context = context or {}
      context.count = 0
      context.sum = 0
    end,
    reduce = function(context, value)
      context.sum = context.sum + value
      context.count = context.count + 1
    end,
    finish = function(context)
      local count = context.count
      if (count == 0) then
        return 0
      end
      return context.sum / count
    end
  }
} 


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

local result = 0

local ids = redis.call('zrangebystore', key, rangeStart, rangeEnd)
if (#ids > 0) then
  local context = {}
  local handler = aggregators[aggregator]
  local reduce = handler.reduce
  handler.init(context)
  
  for _, id in ipairs(ids) do
    local jobKey = prefix .. id
    local job = redis.call('hmget', jobKey, 'attemptsMade', 'name')
    local attemptsMade = toNumber(job[1] or 0)
    local name = job[2]

    if jobFilterFn(name) and (attemptsMade ~= nil) then
      reduce(context, attemptsMade)
    end
  end
  result = handler.finish(context)
end

return result
