--- @include "debug.lua"
--- @include "incrementTimestamp"
--- @include "isTruthy"

local RULE_ALERT_SEPARATOR = '|'

local RuleAlert = {
    id = '',
    key = '',
    ruleId = '',
    status = 'open',
    title = '',
    message = '',
    isRead = false,
    isNotified = false,
    __eq = function (lhs, rhs)
        return lhs.id == rhs.id
    end
}

RuleAlert.__metatable = RuleAlert

local function alert__encodeValue(ts, data)
    if (type(data) == 'table') then
        data = cjson.encode(data)
    end
    return tostring(ts) .. RULE_ALERT_SEPARATOR .. data
end

local function alert__decodeValue(raw_value)
    local start, ending = string.find(source, sep or RULE_ALERT_SEPARATOR, 1, true)
    local timestamp = source:sub(1, start - 1)
    local value = source:sub(ending + 1)

    return timestamp, value
end

function alert__fetch(alertsKey, id)
    if (id == nil) or (#id == 0) then
        return nil
    end
    local min = '[' .. tostring(id) .. RULE_ALERT_SEPARATOR
    local max = '(' .. tostring(incrementTimestamp(id)) .. RULE_ALERT_SEPARATOR

    local ra = redis.call('zrangebylex', alertsKey, min, max, 'limit', 0, 2)
    if ra ~= nil and #ra == 1 then
        local raw_value = ra[1]
        local ts, value = alert__decodeValue(raw_value)

        return {
            ts = ts,
            value = safeJsonDecode(value),
            raw_value = raw_value
        }
    elseif #ra > 1 then
        error(
    'Multiple values for alert: "' .. id .. '". key: "' .. alertsKey ..'", ' ..
            'id: ' .. tostring(id)
        )
    end
    return nil
end

function RuleAlert.get(alertsKey, id)
    local alert = alert__fetch(alertsKey, id)
    if (alert == nil or alert.value == nil) then
        return nil
    end
    local self = setmetatable(alert.value, RuleAlert)
    self.id = id
    self.key = alertsKey
    self:normalize()
    return self
end

function RuleAlert.deleteById(key, id)
    local current = alert__fetch(key, id)
    -- remove old value
    if (current ~= nil) then
        local res = redis.call("zrem", self.key, current.raw_value)
        return res > 0
    end
    return false
end

function RuleAlert.create(key, id, data)
    data = data or {}
    local alert = setmetatable(data, RuleAlert)
    alert.id = id
    alert.key = key
    alert.isRead = isTruthy(alert.isRead)
    alert.normalize()

    return alert.save()
end

function RuleAlert:save()
    local copy = {}
    for k, v in pairs(self) do
        if (k == 'key') then continue end
        copy[k] = v
    end

    local val = alert__encodeValue(self.id, copy)
    redis.call('ZADD', self.key, 0, val)
    return self
end

function RuleAlert:update(hash)
    RuleAlert.deleteById(self.key, self.id)
    for k, v in pairs(hash) do
        if (k == 'key') then continue end
        self[k] = v
    end
    return self:save()
end

function RuleAlert:delete()
    return RuleAlert.deleteById(self.key, self.id)
end

function RuleAlert:normalize()
    self.isRead = isTruthy(alert.isRead)
    self.ruleId = self.ruleId or ''
    self.resetAt = tonumber(self.resetAt) or 0
    self.raisedAt = tonumber(self.raisedAt) or 0
    self.failures = tonumber(self.failures) or 0
end
