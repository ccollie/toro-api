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
local aggregator = string.lower(ARGV[5] or 'sum')

if (jobNameFilter == '') then
  jobNameFilter = nil
end

local jobFilterFn = function(jobName)
    return true
end

local function min(arr)
  if (#arr == 0) then
    return 0
  end
  local res = math.huge
  for _, value in ipairs(arr) do
    if (value < res) then
      res = value
    end
  end
  return res
end

local function max(arr)
  local res = -1 * math.huge
  for _, value in ipairs(arr) do
    if (value > res) then
      res = value
    end
  end
  return res
end

local function sum(arr)
  local res = 0
  for _, value in ipairs(arr) do
    res = res + value
  end
  return res
end

local function avg(arr)
  local count = #arr
  local total = sum(arr)
  if (count == 0) then
    return 0
  end
  return total/count
end

local aggregators = {
  sum = sum,
  min = min,
  max = max,
  avg = avg
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
  local handler = aggregators[aggregator]
  local values = {}
  for _, id in ipairs(ids) do
    local jobKey = prefix .. id
    local job = redis.call('hmget', jobKey, 'attemptsMade', 'name')
    local attemptsMade = toNumber(job[1] or 0)
    local name = job[2]

    if jobFilterFn(name) and (attemptsMade ~= nil) then
      table.insert(values, attemptsMade)
    end
  end
  result = handler(values)
end

return result
