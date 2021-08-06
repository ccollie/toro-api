--[[
      More performant way to get job states.
      Input:
        KEYS[1]   COMPLETED key,
        KEYS[2]   FAILED key
        KEYS[3]   DELAYED key
        KEYS[4]   ACTIVE key
        KEYS[5]   WAITING key
        KEYS[6]   PAUSED key
        KEYS[7]   WAITING-CHILDREN key

        ARGV[...]   job ids
      Output:
        job state, one per arg
]]

local STATE_LIST = {'completed', 'failed', 'delayed', 'active', 'waiting', 'paused', 'waiting-children'}
local LIST_KEYS = {
    ['wait'] = 1,
    ['waiting'] = 1,
    ['active'] = 1,
    ['paused'] = 1,
}

local hasLPOS = redis.call('COMMAND', 'INFO', 'LPOS')
hasLPOS = (hasLPOS[1] ~= nil)

local function searchListByLPOS(key, jobId)
    return redis.call("LPOS", key, jobId) ~= nil
end

local listDataCache = {}

local function searchListByLRANGE(key, jobId)
    local list = listDataCache[key]
    if (list == nil) then
        list = redis.call("LRANGE", key, 0, -1)
        listDataCache[key] = list
    end
    for _, v in pairs(list) do
        if v == jobId then
            return true
        end
    end
    return false
end

local inListFn = hasLPOS and searchListByLPOS or searchListByLRANGE;

local function getState(jobId)
    local valid = false
    local isInList = inListFn

    for i, key in ipairs(KEYS) do
        local state = STATE_LIST[i]
        local isListKey = LIST_KEYS[state] == 1
        if (isListKey) then
            valid = isInList(key, jobId)
        else
            valid = redis.call("ZSCORE", key, jobId) ~= nil
        end
        if (valid) then
            return state
        end
    end
    return 'unknown'
end

local result = {}
for i, jobId in ipairs(ARGV) do
    result[i] = getState(jobId)
end

return result
