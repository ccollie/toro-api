-------------------------------------------------------------------------------
-- Forward declarations to make everything happy
-------------------------------------------------------------------------------

local Toro = {
}


local ToroRule = {
}
ToroRule.__index = ToroRule

-- raw xrange value should be a kv table [name, value, name, value]
-- convert to an associative array
local function to_hash(value)
    local len, result = #value, {}

    for k = 1, len, 2 do
        result[ value[k] ] = value[k+1]
    end
    return result
end

--- PARAMETER PARSING --------

local function get_key_val_varargs(method, ...)
    local arg = { ... }
    local n = #arg

    assert(n, 'No values specified for  ' .. method .. '.')
    assert(math.mod(n, 2) == 0, 'Invalid args to ' .. method .. '. Number of arguments must be even')
    return arg
end

--- STREAMS ----
local function getStreamItem(key, timestamp)
    local ra = redis.call('XRANGE', key, timestamp, timestamp, 'COUNT', 1)
    if ra ~= nil and #ra == 1 then
        local entry = ra[1]
        local value = entry[2]
        return entry[1], value
    end
    return nil, nil
end

local function getStreamRange(key, cmd, min, max, count)
    local fetch_params = {key, min, max}
    if (count ~= nil) then
        fetch_params[#fetch_params + 1] = 'COUNT'
        fetch_params[#fetch_params + 1] = count
    end
    return redis.call(cmd, unpack(fetch_params))
end

local function getStreamTimespan(alertsKey)
    if redis.call('exists', alertsKey) == 0 then return { nil, nil } end
    local info = redis.pcall('XINFO', 'STREAM', alertsKey)
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

--- split id into timestamp and sequence number
local function split(source, sep)
    sep = sep or '.'
    local start, ending = string.find(source, sep, 1, true)
    if (start == nil) then
        return tonumber(source), nil
    end
    local timestamp = source:sub(1, start - 1)
    local sequence = source:sub(ending + 1)
    return tonumber(timestamp), sequence
end

local function getLastWrite(key)
    local last = redis.pcall('XREVRANGE', key, '+', '-', 'COUNT', 1)
    if next(last) ~= nil then
        local ts = last[1][1]
        return split(ts)
    end
    -- Stream is empty or key doesn`t exist
    return nil
end
-------------------------------------------------------------------------------
-- Rule class
-------------------------------------------------------------------------------
-- Return a Rule object
function Toro.rule(ruleId, key, indexKey, alertsKey, busKey)
    assert(ruleId, 'Rule(): no id provided')
    local rule = {
        id = ruleId,
        key = key,
        indexKey = indexKey,
        alertsKey = alertsKey,
        busKey = busKey
    }
    setmetatable(rule, ToroRule)

    rule.emit = function(eventName, ...)
        local params = get_key_val_varargs("emit", ...)
        redis.call("XADD", busKey, "*", "event", eventName, "rid", ruleId, unpack(params))
    end

    local function removeAlertRange(range)
        if #range > 0 then
            local ids = {}
            local id
            for i, value in ipairs(range) do
                id = value[1]
                ids[i] = id
                rule.emit('alert.deleted', 'id', id, unpack(value))
            end
            return redis.call('XDEL', alertsKey, unpack(ids))
        end
        return #range
    end

    -- Access to our alerts
    rule.alerts = {
        get = function(id)
            -- ts = assert(tonumber(ts), 'invalid timestamp')
            local ts, value = getStreamItem(alertsKey, id)
            if (ts ~= nil) then
                return value
            end
            return nil
        end,
        getRange = function(min, max, count)
            local data = getStreamRange(alertsKey,'XRANGE', min, max, count)
            return data
        end,
        getRevRange = function(min, max, count)
            local data = getStreamRange(alertsKey,'XREVRANGE', min, max, count)
            return data
        end,
        add = function(eventName, ...)
            local data = get_key_val_varargs("add", ...)

            local ts = redis.call("XADD", alertsKey, id, unpack(data))

            rule.emit(eventName, "id", tostring(ts), unpack(data))

            return tostring(ts)
        end,
        remove = function(...)
            local arg = { ... }
            if #arg > 0 then
                local values = {}
                local j = 0
                for _, id in ipairs(arg) do
                    local value = getStreamItem(alertsKey, id)
                    if (value[1] ~= nil) then
                        values[j] = value
                        j = j + 1
                    end
                end
                return removeAlertRange(values)
            end
        end,
        removeRange = function(min, max)
            local data = rule.alerts.getRange(min, max)
            local res = 0
            if data and #data > 0 then
                res = removeAlertRange(data)
            end
            return res
        end,
        removeAll = function()
            local res = res.alerts.removeRange('-', '+')
            redis.call('DEL', alertsKey)
            return res
        end,
        span = function()
            return getStreamTimespan(alertsKey)
        end,
        length = function()
            redis.call("XLEN", alertsKey)
        end
    }

    return rule
end


function ToroRule:remove()
    self.alerts.removeAll()
    local res = redis.call("DEL", self.id)
    redis.call('ZREM', self.indexKey, self.id)
    --- todo: emit("rule.deleted", "id", self.id )
    return res
end

function ToroRule:data()
    return redis.call('HGETALL', self.key)
end

function ToroRule:add(eventName, ...)
    return self.alerts.add(eventName, ...)
end

function ToroRule:getAlert(id)
    return self.alerts.get(id)
end

function ToroRule:getAlertRange(min, max, asc)
    if asc == nil then asc = 1 end
    if asc == 1 then
        return self.getRange(min, max)
    else
        return self.getRevRange(min, max)
    end
end

--[[
  Clean a range of items
  Input:
    retention   retention time in ms. Items with score < (latest - retention) are removed
  Output:
    the number of items removed
]]
function ToroRule:pruneAlerts(retention)
    retention = assert(retention, 'retention value must be a number (ms)')
    local lastTs = getLastWrite(self.alertsKey)
    local res = 0
    if (lastTs ~= nil) then
        local maxTs = tonumber(lastTs) - retention
        res = self.alerts.removeRange('-', maxTs)
        if res > 0 then
            self.emit("alerts.cleanup", "start", firstTs, "end", tostring(maxTs))
        end
    end
    return res
end

function ToroRule:removeAlerts(...)
    return self.alerts.remove(...)
end

function ToroRule:removeAlertRange(min, max)
    return self.alerts.removeRange(min, max)
end

function ToroRule:clearAlerts()
    return self.alerts.removeAll()
end

function ToroRule:getAlertCount()
    return self.alerts.length()
end

function dispatch(cmd, rule)
    local dispatchTable = {
        ['rule.get'] = rule.data,
        ['rule.delete'] = rule.remove,
        ['alerts.add'] = rule.add,
        ['alerts.get'] = rule.get,
        ['alerts.delete'] = rule.removeAlerts,
        ['alerts.count'] = rule.getAlertCount,
        ['alerts.clear'] = rule.clearAlerts,
        ['alerts.getRange'] = rule.getAlertRange,
        ['alerts.prune'] = rule.pruneAlerts
    }
    local command = assert(dispatchTable[cmd], 'Unknown command "' .. cmd .. '"')
    return command(unpack(ARGV))
end

assert(#KEYS == 4, 'Expected 4 keys')
local ruleKey = KEYS[1]
local indexKey = KEYS[2]
local alertsKey = KEYS[3]
local busKey = KEYS[4]
local ruleId = assert(table.remove(ARGV, 1), 'Rule id not provided')
local cmd = assert(table.remove(ARGV, 1), 'Must provide a command')

local rule = Toro.rule(ruleId, ruleKey, indexKey, alertsKey, busKey)
return dispatch(cmd, rule)
