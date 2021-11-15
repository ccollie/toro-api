--[[
      Check if an id exists in a redis list.
      Input:
        KEYS[1]   key
        ARGV[1]   job id
      Output:
        1 if id is in any of the lists specified by KEYS
        0 otherwise
]]
local _inlistFn = nil
local function isInRedisList (key, item)
    if (not _inlistFn) then
        local rcall = redis.call
        local hasLPOS = rcall('COMMAND', 'INFO', 'LPOS') ~= nil
        if hasLPOS then
            _inlistFn = function(k, v)
                return rcall("LPOS", k, v) ~= false
            end
        else
            _inlistFn = function(key, item)
                local list = rcall("LRANGE", key, 0, -1)
                for _, v in pairs(list) do
                    if v == item then
                        return true
                    end
                end
                return false
            end
        end
    end
    return _inlistFn(key, item)
end
