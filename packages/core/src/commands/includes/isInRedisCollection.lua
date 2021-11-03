--[[
      Check if an id exists in a redis key
      Output:
        1 if id is in any of the lists specified by KEYS
        0 otherwise
]]
--- @include "isInRedisList.lua"

local function isInRedisCollection(key, jobId)
    local rcall = redis.call

    local t = rcall('TYPE', key)
    t = t["ok"]
    if (t == 'zset') then
        return rcall("ZSCORE", key, jobId) ~= false
    elseif (t == 'list') then
        return isInRedisList(key, jobId)
    elseif (t == 'set') then
        return rcall('SISMEMBER', key, jobId)
    elseif (t == 'hash') then
        return rcall('HEXISTS', key, jobId)
    end
    return false
end
