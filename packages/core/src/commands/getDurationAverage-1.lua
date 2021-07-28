--[[
  Input:
    KEYS[1]  Source key
    ARGV[1]  key prefix
    ARGV[2]  job name -- optional, can be nil or empty string
    ARGV[3]  limit
  Output:
    (number)
]]
local key = KEYS[1]
local prefix = ARGV[1]
local jobName = ARGV[2]
local limit = assert(tonumber(ARGV[3] or 500), 'Invalid value for limit')
local amount = 0
local counter = 0

if (jobName == '') then
    jobName = nil
end

local ids = redis.call('zrevrange', key, 0, limit)
if (#ids > 0) then
  for _, id in ipairs(ids) do
    local jobKey = prefix .. id
    local job = redis.call('hmget', jobKey, 'finishedOn', 'processedOn', 'name')
    local finishedOn = tonumber(job[1])
    local processedOn = tonumber(job[2])
    local name = job[3]

    local timestampsValid = (finishedOn ~= nil and processedOn ~= nil);
    local jobNameValid = (jobName == nil) or (name == jobName)

    if (timestampsValid and jobNameValid) then
      amount = amount + (finishedOn - processedOn)
      counter = counter + 1
    end
  end
  if counter == 0 then
    return 0
  end
  return (amount / counter)
end

return 0