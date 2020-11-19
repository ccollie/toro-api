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

local function item_in_list (key, item)
    local list = redis.call("LRANGE", key, 0, -1)
    for _, v in pairs(list) do
        if v == item then
            return true
        end
    end
    return false
end

local function item_in_zset(key, item)
    local score = redis.call("ZSCORE", key, item)
    return tonumber(score) and true or false
end

local findFunctions = {
    active = item_in_list,
    completed = item_in_zset,
    wait = item_in_list,
    waiting = item_in_list,
    delayed = item_in_zset,
    paused = item_in_list,
    failed = item_in_zset
}

-- extract the states names from the key e.g. bull:my_queue:WAITING => WAITING
local function extract_state(key)
    local index = string.find(key, ":[^:]*$")
    return key:sub(index+1)
end

local jobId = ARGV[1]

for _, key in pairs(KEYS) do
    local status = extract_state(key)

    local findFn = findFunctions[status]
    if (findFn ~= nil) then
        if findFn(key, jobId) == true then
            if status == 'PAUSED' then
                status = 'WAITING'
            end
            return status
        end
    end
end

return 'unknown'
