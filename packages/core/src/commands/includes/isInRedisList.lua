--[[
      Check if an id exists in a redis list.
      Input:
        KEYS[1]   key
        ARGV[1]   job id
      Output:
        1 if id is in any of the lists specified by KEYS
        0 otherwise
]]
local hasLPOS = nil

local function isInRedisList (key, item)
    local rcall = redis.call
    if (hasLPOS == nil) then
        hasLPOS = rcall('COMMAND', 'INFO', 'LPOS') ~= nil
    end
    if (hasLPOS) then
        return rcall("LPOS", key, item) ~= false
    end
    local list = rcall("LRANGE", key, 0, -1)
    for _, v in pairs(list) do
        if v == item then
            return true
        end
    end
    return false
end
