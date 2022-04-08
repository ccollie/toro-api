--[[
  Input:
    KEYS[1]  Source key (completed)
    ARGV[1]  key prefix
    ARGV[2]  job name -- optional, can be nil or empty string
    ARGV[3]  limit
  Output:
    (number)
]]
local key = KEYS[1]
local prefix = ARGV[1]
local jobNameFilter = ARGV[2]
local limit = assert(tonumber(ARGV[3] or 500), 'Invalid value for limit')
local total = 0
local counter = 0

local min = math.huge
local max = -math.huge

if (jobNameFilter == '') then
    jobNameFilter = nil
end

local ids = redis.call('zrevrange', key, 0, limit)
if (#ids > 0) then
  for _, id in ipairs(ids) do
    local jobKey = prefix .. id
    local job = redis.call('hmget', jobKey, 'finishedOn', 'processedOn', 'name')
    local finishedOn = tonumber(job[1])
    local processedOn = tonumber(job[2])
    local name = job[3]

    if (finishedOn ~= nil and processedOn ~= nil) then
      local jobNameValid = (jobNameFilter == nil) or (name == jobNameFilter)

      if (jobNameValid) then
        local duration = finishedOn - processedOn
        total = total + duration
        counter = counter + 1

        if (duration < min) then
          min = duration
        end

        if (duration > max) then
          max = duration
        end
      end
    end
  end
  if counter == 0 then
    return 0
  end
  return (total / counter)
end

return 0
