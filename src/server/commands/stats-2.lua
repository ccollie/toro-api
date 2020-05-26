
local StatsAPI = {}
StatsAPI.__index = AlertAPI;

local busKey = KEYS[2]

local function isNumeric(text)
    return tonumber(text) and true or false
end


function StatsAPI.add(key, ts, value)
    ts = assert(tonumber(ts), 'invalid stats timestamp')
    assert(cjson.decode(value), 'no updated value specified')

    local res = redis.call("ZADD", key, ts, value)

    redis.call("XADD", busKey, "*",
            "event", "stats.added", "ts", tostring(ts), "key", key,  "data", value)

    return res
end

local function minMaxHelper(args, withScores)
    if (withScores == true) then
        args[#args] = "WITHSCORES"
    end
    local res = redis.call(unpack(args))
    if (type(res) == "table") then
        if (withScores == true) then
            return { res[2], res[1] }
        end
        return res[1]
    end
    return res
end

local function getFirst(key, withScores)
    local args = {"ZRANGE", key, "-inf", "+inf", "LIMIT", 0, 1}
    return minMaxHelper(args, withScores)
end

local function getLast(key, withScores)
    local args = {"ZREVRANGE", key, "+inf", "-inf", "LIMIT", 0, 1}
    return minMaxHelper(args, withScores)
end

function StatsAPI.getSpan(key)
    local first = getFirst(key, true)
    local last = getLast(key, true)
    local min = nil
    local max = nil
    if (first ~= nil) then
        min = tonumber(first[1])
    end
    if (last ~= nil) then
        max = tonumber(last[1])
    end
    return { min, max }
end


function StatsAPI.getFirst(key)
    return getFirst(key, true)
end

function StatsAPI.getLast(key)
    return getLast(key, true)
end

--[[
  Find score gaps > a given interval in a sorted set. Used in stats aggregation
  to determine where "catch up" is needed in the case that the server was down
  for a period (hence aggregation was not done)
  Input:
    key         sorted set key
    startScore  start score
    end         end score
    interval    interval time in ms
  Output:
    gaps in items as a list of [start, end]
]]
function StatsAPI.getGaps(key, startScore, endScore, interval)
    interval = assert(tonumber(interval), 'interval value must be a number (ms)')
    local ids = {}
    local range = redis.call('ZRANGEBYSCORE', key, startScore, endScore, 'WITHSCORES')

    local i = 0
    local score, prev = nil, nil
    for _, value in ipairs(range) do
        score = tonumber(value[1])
        if (isNumeric(prev) and math.abs(score - prev) > interval) then
            ids[i + 1] = prev
            ids[i + 2] = score
            i = i + 2
        end
        prev = score
    end

    return ids
end

--[[
  Clean a range of items
  Input:
    key         stream key,
    retention   retention time in ms. Items with score < (latest - retention) are removed
  Output:
    the number of items removed
]]
function StatsAPI.cleanup(key, retention)
    retention = assert(tonumber(retention), 'retention value must be a number (ms)')
    local last = redis.call("ZREVRANGE", key, 0, 0, "WITHSCORES")
    if (last ~= nil) then
        local max = tonumber(last[2]) - retention
        local res = redis.call("ZREMRANGEBYSCORE", key, 0, max)
        redis.call("XADD", busKey, "*", "event", "stats.cleanup", "key", key, "start", 0, "end", tostring(max))
        return res
    end
    return 0
end


function StatsAPI.del(key)
    return redis.call("del", key)
end

local command_name = assert(table.remove(ARGV, 1), 'Must provide a command')
local command      = assert(StatsAPI[command_name], 'Unknown command ' .. command_name)

return command(KEYS[1], unpack(ARGV))
