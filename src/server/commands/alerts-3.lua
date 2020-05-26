
local AlertAPI = {}
AlertAPI.__index = AlertAPI;

local alertsKey = KEYS[1]
local indexKey = KEYS[2]
local busKey = KEYS[3]

local function get_single_value(timestamp)
    local ra = redis.call('XRANGE', alertsKey, timestamp, timestamp, 'COUNT', 1)
    if ra ~= nil and #ra == 1 then
        local entry = ra[1]
        local value = entry[2]
        return entry[1], value
    end
    return nil, nil
end

local function get_range(cmd, params)
    local fetch_params = {alertsKey, params.min, params.max}
    if (params.count ~= nil) then
        fetch_params[#fetch_params + 1] = 'COUNT'
        fetch_params[#fetch_params + 1] = params.count
    end
    return redis.call(cmd, unpack(fetch_params))
end

--- Index Utils

local SEPARATOR = '|'

local function encode_value(ts, data)
    return tostring(ts) .. SEPARATOR .. tostring(data)
end

local function update_index(timestamp, value)
    local val = encode_value(timestamp, value)
    redis.call('ZADD', indexKey, 0, val)
end

local function remove_from_index(timestamp, value)
    local val = encode_value(timestamp, value)
    redis.call('ZREM', indexKey, val)
end

---

local function get_key_val_varargs(method, ...)
    local arg = { ... }
    local n = #arg

    assert(n, 'No values specified for  ' .. method .. '.')
    assert(math.mod(n, 2) == 0, 'Invalid args to ' .. method .. '. Number of arguments must be even')
    return arg
end

local function emit(eventName, ...)
    local params = get_key_val_varargs("emit", ...)
    redis.call("XADD", busKey, "*", "event", eventName, unpack(params))
end

function AlertAPI.count()
    redis.call("XLEN", alertsKey)
end

function AlertAPI.add(ruleId, eventName, ...)
    local data = get_key_val_varargs("add", ...)

    local ts = redis.call("XADD", alertsKey, '*', unpack(data))

    update_index(ts, ruleId);

    emit(eventName, "rid", ruleId, "alertId", tostring(ts))

    return tostring(ts)
end

function AlertAPI.get(ts)
    -- ts = assert(tonumber(ts), 'invalid timestamp')
    local arr = redis.call('XRANGE', alertsKey, ts, ts, 'COUNT', 1)
    if (arr ~= nil) then
        return arr[1]
    end
    return nil
end

function AlertAPI.delete(ruleId, ts)
    ts = assert(tonumber(ts), 'invalid timestamp')
    local value, foundTs = get_single_value(ts)
    local res = 0
    if value ~= nil then
        res = redis.call("XDEL", alertsKey, foundTs)
        if (res > 0) then
            remove_from_index(ts, ruleId)
            emit("alert.deleted", "rid", ruleId, "alertId", ts)
        end
    end
    return res
end

local function remove_values(ruleId, values)
    if values and #values > 0 then
        local ids = {}
        local indexValues = {}
        local id
        for i, value in ipairs(values) do
            id = value[1]
            ids[i] = id
            indexValues[#indexValues + 1] = encode_value(id, ruleId)
        end
        redis.call('ZREM', indexKey, unpack(indexValues))
        return redis.call('XDEL', alertsKey, unpack(ids))
    end
    return 0
end

--[[
  Clean a range of items
  Input:
    key         stream key,
    retention   retention time in ms. Items with score < (latest - retention) are removed
  Output:
    the number of items removed
]]
function AlertAPI.cleanup(ruleId, retention)
    retention = assert(retention, 'retention value must be a number (ms)')
    local span = AlertAPI.span()
    local firstTs
    local lastTs
    if (span ~= nil) then
        firstTs = span[1]
        lastTs = span[2]
    end
    local res = 0
    if (lastTs ~= nil) then
        local maxTs = tonumber(lastTs) - retention
        local params = { min = '-', max = maxTs }
        local alerts = get_range("XRANGE", params)
        res = remove_values(ruleId, alerts)
        emit("alerts.cleanup", "rid", ruleId, "start", firstTs, "end", tostring(maxTs))
    end
    return res
end


function AlertAPI.clear(ruleId)
    local alerts = redis.call("ZRANGE", indexKey, "-", "+")

    local res = redis.call("del", alertsKey)

    --- remove index entries
    if alerts and #alerts > 0 then
        res = #alerts
        local values = {}
        local _start = alerts[1][1]
        local _end = alerts[#values][1]

        local id
        for i, value in ipairs(alerts) do
            id = value[1]
            values[i] = encode_value(id, ruleId)
        end
        redis.call('ZREM', indexKey, unpack(values))

        emit("alerts.cleanup", "rid", ruleId, "start", _start, "end", _end)
        emit("alerts.cleared", "rid", ruleId)
    else
        res = 0
    end

    return res
end


function AlertAPI.getLastTs()
    local span = AlertAPI.span()
    if (span) then
        return span[2]
    end
    return nil
end


function AlertAPI.span()
    if redis.call('exists', alertsKey) == 0 then return nil end
    local info = redis.pcall('XINFO', 'STREAM', key)
    if (info ~= nil) then
        local first, last
        for i, v in ipairs(info) do
            if (v == 'first-entry') then first = info[i+1] end
            if (v == 'last-entry') then last = info[i+1] end
            if (first and last) then break end
        end
        if (first ~= nil) and #first then
            first = first[1]
        else
            first = false
        end
        if (last ~= nil) and #last then
            last = last[1]
        else
            last = false
        end
        return { first, last }
    end
    return nil
end


local command_name = assert(table.remove(ARGV, 1), 'Must provide a command')
local command      = assert(AlertAPI[command_name], 'Unknown command ' .. command_name)

return command(unpack(ARGV))
