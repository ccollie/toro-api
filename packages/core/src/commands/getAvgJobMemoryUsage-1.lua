--[[
  Input:
    KEYS[1]  Source key
    ARGV[1]  keys prefix
    ARGV[2]  job name
    ARGV[3]  limit
  Output:
    (integer)
]]
local key = KEYS[1]
local prefix = ARGV[1]
local jobName = ARGV[2] or nil
local limit = assert(tonumber(ARGV[3] or 200), 'Invalid value for limit')

local rcall = redis.call

local ids = rcall('zrevrange', key, 0, limit)
local byteCount = 0

if (#ids == 0) then
    return 0
end

if (jobName == '') then
    jobName = nil
end

local counter = 0

for _, jobId in ipairs(ids) do
    local jobKey = prefix .. jobId
    local isValidName = true

    if (jobName ~= nil) then
        local name = rcall('hget', jobKey, 'name')
        isValidName = (name == jobName)
    end
    if (isValidName) then
        byteCount = byteCount + rcall('memory', 'usage', jobKey)
        counter = counter + 1
    end
end

if (counter == 0) then
    return 0
end

return byteCount / counter
