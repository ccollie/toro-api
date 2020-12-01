--[[
      Discover job names
      Input:
        KEYS[1]   COMPLETED key,
        KEYS[2]   FAILED key
        KEYS[3]   DELAYED key
        KEYS[4]   ACTIVE key
        KEYS[5]   WAITING key
        KEYS[6]   PAUSED key
        KEYS[7]   scratch key
        KEYS[8]   destination key

        ARGV[1]   keyPrefix
        ARGV[2]   expiration (ms)
      Output:
        unique job names found in the queue
]]

local keyPrefix = ARGV[1]
local scratchKey = KEYS[7]
local destination = KEYS[8]

local MAX_ITEMS = 110
local function add_from_list (key, result, dedupe)
    local items = {}

    local type = redis.call("TYPE", key)
    type = type["ok"]

    if type == 'zset' then
        items = redis.call("ZRANGE", key, 0, -1)
    elseif type == "list" then
        items = redis.call("LRANGE", key, 0, -1)
    elseif type == "set" then
        items = redis.call("SMEMBERS", key)
    else
        return
    end
    for _, v in pairs(items) do
        if dedupe[v] ~= 1 then
            dedupe[v] = 1
            result[#result + 1] = v
            if #result >= MAX_ITEMS then
                return
            end
        end
    end
end

local result = redis.call("smembers", destination)
if result ~= nil and #result > 0 then
    return result
end

local dedup = {}
result = {}


for i = 1, 6 do
    add_from_list(KEYS[i], result, dedup)
end

if #result > 0 then
    redis.call("sadd", scratchKey, unpack(result))

    local allNames = redis.call("sort", scratchKey, "BY", "nosort", "GET", keyPrefix .. "*->name", "LIMIT", 0, MAX_ITEMS)

    --- in some circumstances, we get non strings in the answer
    result = {}
    for _, v in ipairs(allNames) do
        if type(v) == 'string' then
            result[#result + 1] = v
        end
    end
    allNames = result

    if #allNames > 0 then
        redis.call("sadd", destination, unpack(allNames))
    end

    redis.call("del", scratchKey)

    local exists = redis.call("exists", destination)

    if exists then
        if (ARGV[2]) then
            redis.call("pexpire", destination, ARGV[2])
        end

        result = redis.call("smembers", destination)
    else
        result = {}
    end

end


return result

