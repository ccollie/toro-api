--[[
      Manage rule states
      Input:
        KEYS[1]   Rule key,
        KEYS[2]   Rule state key,
        KEYS[3]   Alerts key
        KEYS[4]   Bus key

        ARGV[1]   rule id
        ARGV[2]   current timestamp
        ARGV[3]   action
        ARGV[4]   payload
]]

--- @include "includes/Rule"
--- @include "includes/RuleAlert"
--- @include "includes/toStr"
--- @include "includes/debug"
--- @include "includes/isTruthy"
--- @include "includes/hashToArray"

local ALERT_TRIGGERED_EVENT = 'alert.triggered'
local ALERT_RESET_EVENT = 'alert.reset'
local STATE_CHANGED = 'rule.state-changed'

local ERROR_LEVEL_NONE = 'NONE'
local ERROR_LEVEL_WARNING = 'CRITICAL'
local ERROR_LEVEL_CRITICAL = 'WARNING'

local ruleKey = KEYS[1] or ''
local ruleStateKey = KEYS[2]
local alertsKey = KEYS[3]
local busKey = KEYS[4]

local ruleId = ARGV[1]
local now = tonumber(ARGV[2] or 0)
local action = assert(ARGV[3], 'missing "action" argument')
local parameter = ARGV[4]

local rule
local result = {}

local rcall = redis.call

local function loadRule()
    if not rule then
        rule = Rule.get(ruleKey, ruleStateKey)
        if (rule == nil) then
            error('rule not found: ' .. toStr(ruleKey))
        end
        rule:loadState()
        --- todo: error if not found
    end
    return rule
end

local function emitEvent(event, ...)
    local args = { ... }
    --- debug('event ', event, ' rule Id= "' .. toStr(rule.id) .. '" ', 'args=' .. cjson.encode(args))
    rcall("XADD", busKey, "*", "event", event, "ruleId", rule.id, "ts", now, unpack(args))
    rcall("XTRIM", busKey, "MAXLEN", "~", 10)
    --- todo: trim
end

local function getAlert(id)
    return RuleAlert.get(alertsKey, id)
end

local function createAlert(data)
    local id = data.id

    local alert = {
        id = id,
        ruleId = rule.id,
        status = 'open',
        errorLevel = data.errorLevel,
        severity = rule.severity,
        state = data.state,
        title = data.title or '',
        message = data.message or '',
        failures = data.failures,
        value = data.value,
        raisedAt = now
    }

    local alertObj = RuleAlert.create(alertsKey, id, alert)
    local serialized = cjson.encode({
        value = alert.value,
        errorLevel = alert.errorLevel,
    })

    debug('createAlert: ' .. toStr(alert))

    --- Raise event
    emitEvent(ALERT_TRIGGERED_EVENT, 'id', id, 'data', serialized)

    local alertCount = rcall('zcard', alertsKey)
    rule:update({
        alertCount = alertCount
    })
    rule:setState({ alertId = id })
    return alertObj
end

--- ??? setState(event, data)
local function updateAlert(id, data)
    local alert = getAlert(id)
    if (alert == nil) then
        error('alert not found: ' .. toStr(id))
    end
    local id = data.id

    local update = {
        id = id,
        status = 'open',
        errorLevel = data.errorLevel,
        state = data.state,
        title = data.title or '',
        message = data.message or '',
        failures = data.failures,
        value = data.value,
    }

    alert:update(update)
end

local function resetCurrentAlert(now)
    local alertId = rule.ruleState.alertId
    if (alertId ~= nil) then
        local alert = RuleAlert.get(alertsKey, alertId)
        if (alert ~= nil) then
            alert:update({
                status = 'closed',
                resolvedAt = now
            })
            --- Raise event
            emitEvent(ALERT_RESET_EVENT, 'id', alertId)
            return true
        end
    end
    return false
end


local function handleResult(now, data)
    local errorStatus = data.errorStatus or ERROR_STATUS_ERROR
    local saveState = rule.state

    local result = rule:handleResult(now, errorStatus)

    if (result.status == RUN_STATE_ACTIVE) then
      if (result.changed) then
        if result.state == CIRCUIT_OPEN then
            local alertId = result.alertId
            data.failures = result.failures
            if (not alertId) then
                createAlert(data)
                result.alertId = data.id
            else
                updateAlert(alertId, data)
            end
        else
            resetCurrentAlert(now)
        end

        local eventArgs = { 'event', STATE_CHANGED, 'id', rule.id, 'ts', now, 'oldState', saveState, 'newState', rule.state }
        if (result.alertId) then
            table.insert(eventArgs, 'alertId')
            table.insert(eventArgs, result.alertId)
        end
        rcall("XADD", busKey, '*', 'event', STATE_CHANGED, unpack(eventArgs))
      end
    end

    return hashToArray(result)
end

local function markNotification(now, alertId)
    local currAlertId = rule.ruleState['alertId']
    if (currAlertId ~= alertId) then
        if (currAlertId ~= nil) then

        end
    end
    local result = {}

    local alertCount = rule.alertCount or 0
    local shouldNotify = isTruthy(rule.ruleState.notifyPending)

    if shouldNotify then
        alertCount = alertCount + 1
        rule:setState({
            lastNotify = now,
            alertCount = alertCount,
            notifyPending = 0
        })
        local maxAlertsPerEvent = tonumber(rule.options.maxAlertsPerEvent) or 0
        if (maxAlertsPerEvent > 0) then
            result.remaining = math.min(0, maxAlertsPerEvent - alertCount)
        end
        local interval = tonumber(rule.options.notifyInterval) or 0
        if (interval > 0) then
            result.nextEarliest = now + interval
        end
    end
    result.notified = doNotify
    result.alertCount = alertCount

    return result
end

local function checkState(now)
    if (rule == nil) then
        return {'status', 'not_found'}
    end
    rule:recalcState(now)
    local res = hashToArray(rule.ruleState)
    res[#res + 1] = 'isActive'
    res[#res + 1] = rule.isActive
    res[#res + 1] = 'ruleState'
    res[#res + 1] = rule.state

    return res
end

local function clearState(now)
    resetCurrentAlert(now)
    return rule:checkStateChange(now)
end

--- todo: deleteAlert
loadRule()
if (action == 'check') then
    local evalData = cmsgpack.unpack(parameter)
    rule:start(now)
    return handleResult(now, evalData)
elseif (action == 'start') then
    return rule:start(now)
elseif (action == 'stop') then
    return rule:stop(now)
elseif (action == 'clear') then
    return clearState(now) and 1 or 0
elseif (action == 'alert') then
    local alertData = cmsgpack.unpack(parameter)
    local alert = createAlert(alertData)
    local data = alert:getData()
    return cjson.encode(data)
elseif (action == 'state') then
    return checkState(now)
elseif (action == 'mark-notify') then
    return markNotification(now, parameter)
end
