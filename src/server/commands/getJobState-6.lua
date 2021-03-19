--[[
      More performant way to get job states.
      Input:
        KEYS[1]   COMPLETED key,
        KEYS[2]   FAILED key
        KEYS[3]   DELAYED key
        KEYS[4]   ACTIVE key
        KEYS[5]   WAITING key
        KEYS[6]   PAUSED key

        ARGV[1]   job id
      Output:
        job states, or "unknown" if not found
]]

local jobId = ARGV[1]

local hasLPOS = redis.call('COMMAND', 'INFO', 'LPOS') ~= nil

local function isInList (key)
    local jobId = jobId
    local hasLPOS = hasLPOS
    if (hasLPOS) then
        return redis.call("LPOS", key, jobId) ~= false
    end
    local list = redis.call("LRANGE", key, 0, -1)
    for _, v in pairs(list) do
        if v == jobId then
            return true
        end
    end
    return false
end

local function isInZSet(key)
    local jobId = jobId
    return redis.call("ZSCORE", key, jobId) ~= false
end

if isInZSet(KEYS[1]) then
    return "completed"
end

if isInZSet(KEYS[2]) then
    return "failed"
end

if isInZSet(KEYS[3]) then
    return "delayed"
end

if isInList(KEYS[4]) then
    return "active"
end

if isInList(KEYS[5]) then
    return "waiting"
end

if isInList(KEYS[6]) then
    return "waiting"
end

return 'unknown'
