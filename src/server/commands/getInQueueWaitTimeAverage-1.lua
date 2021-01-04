--[[
  Gets the average wait time for jobs currently in the "wait" list
  Input:
    KEYS[1]  "wait" list key
    ARGV[1]  key prefix
    ARGV[2]  current time
    ARGV[3]  job name -- optional, can be nil or empty string
    ARGV[4]  limit
  Output:
    (number)
]]
local key = KEYS[1]
local prefix = ARGV[1]
local now = assert(tonumber(ARGV[2]),'Invalid value for current time')
local jobName = ARGV[3]
local limit = assert(tonumber(ARGV[4] or 1000), 'Invalid value for limit')
local amount = 0
local counter = 0

if (jobName == '') then
    jobName = nil
end

local count = redis.call('LLEN', key)
local start = math.min(count - limit, 1)
local ids = redis.call("LRANGE", key, start, -1)
if (#ids > 0) then
  for _, id in ipairs(ids) do
    local jobKey = prefix .. id
    local job = redis.call('hmget', jobKey, 'timestamp', 'name')
    local timestamp = tonumber(job[1])
    local name = job[3]

    local timestampsValid = (timestamp ~= nil);
    local jobNameValid = (jobName == nil) or (name == jobName)

    if (timestampsValid and jobNameValid) then
      amount = amount + (now - timestamp)
      counter = counter + 1
    end
  end
  if counter == 0 then
    return 0
  end
  return (amount / counter)
end

return 0