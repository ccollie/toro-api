--[[
      Check if an id exists in a collection.
      Input:
        KEYS[...]   keys,
        ARGV[1]   job id
      Output:
        1 if id is in any of the lists specified by KEYS
        0 otherwise
]]

local rcall = redis.call

local function isInList (key, jobId)
    local hasLPOS = rcall('COMMAND', 'INFO', 'LPOS') ~= nil

    if (hasLPOS) then
        return rcall("LPOS", key, jobId) ~= false
    end
    local list = rcall("LRANGE", key, 0, -1)
    for _, v in pairs(list) do
        if v == jobId then
            return true
        end
    end
    return false
end


local function inCollection(key, jobId)
    local t = rcall('TYPE', key)
    t = t["ok"]
    if (t == 'zset') then
        return rcall("ZSCORE", key, jobId) ~= false
    elseif (t == 'list') then
        return isInList(key, jobId)
    elseif (t == 'set') then
        return rcall('SISMEMBER', key, jobId)
    elseif (t == 'hash') then
        return rcall('HEXISTS', key, jobId)
    end
    return false
end

local jobId = ARGV[1]
for i=1, #KEYS do
    local found = inCollection(KEYS[i], jobId)
    if (found == true or found == 1) then
        return 1
    end
end

return 0
