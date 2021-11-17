--[[
      Check if an id exists in a redis list.
      Input:
        KEYS[1]   key
        ARGV[1]   job id
      Output:
        1 if id is in any of the lists specified by KEYS
        0 otherwise
]]
local lposFn = nil
local function isInRedisList (key, item)
    if (not lposFn) then
        local rcall = redis.call
        local hasLPOS = redis.call('COMMAND', 'INFO', 'LPOS') ~= nil
        if hasLPOS then
            lposFn = function(k, v)
                return rcall("LPOS", k, v) ~= false
            end
        else
            lposFn = function(key, item)
                local list = redis.call("LRANGE", key, 0, -1)
                for _, v in pairs(list) do
                    if v == item then
                        return true
                    end
                end
                return false
            end
        end
    end
    return lposFn(key, item)
end
