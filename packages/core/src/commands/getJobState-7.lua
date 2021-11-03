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

--- @include "includes/isInRedisList"

local jobId = ARGV[1]

local function isInList(key)
    return isInRedisList(key, jobId)
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
    return "paused"
end

if isInZSet(KEYS[7]) then
    return "waiting-children"
end

return 'unknown'
