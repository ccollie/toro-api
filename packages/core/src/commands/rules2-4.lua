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
        ARGV[4]   action parameter
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
        rule.loadState()
        debug(rule)
        --- todo: error if not found
    end
    return rule
end

local function emitEvent(event, ...)
    local args = { ... }
    --- debug('event ', event, ' rule Id= "' .. toStr(rule.id) .. '" ', 'args=' .. cjson.encode(args))
    rcall("XADD", busKey, "*", "event", event, "ruleId", rule.id, "ts", now, unpack(args))
    rcall("XTRIM", busKey, "MAXLEN", "~", 25)
    --- todo: trim
end

local function updateRuleState(state, alertId)
    local alertCount = rcall('zcard', alertsKey)
    if (rule.state ~= state) then
        -- set state and raise event
        rule.state = state
        local args = {'state', state, 'alertCount', alertCount}
        local key  = (state == RULE_STATE_NORMAL) and 'lastResolvedAt' or 'lastTriggeredAt'
        args[#args + 1] = key
        args[#args + 1] = now
        rule:update({
            [key] = now,
            state = state
        })

        emitEvent(STATE_CHANGED, unpack(args))
    else
        rule:update({
            alertsCount = alertCount
        })
    end
    rule:setState({ alertId = alertId })
end

local function getAlert(id)
    return RuleAlert.get(alertsKey, id)
end

local function createAlert(data)
    local id = data.id

    local newState
    local alert = {
        id = id,
        ruleId = rule.id,
        status = 'open',
        errorLevel = data.errorLevel,
        severity = rule.severity,
        state = data.state,
        title = data.title or '',
        message = data.message or '',
        failures = rule.failures,
        value = data.value,
        raisedAt = now
    }
    if (data.errorLevel == ERROR_LEVEL_WARNING) then
        newState = RULE_STATE_WARNING
    elseif data.errorLevel == ERROR_LEVEL_CRITICAL then
        newState = RULE_STATE_ERROR
    end

    local alertObj = RuleAlert.create(alertsKey, id, alert)
    local serialized = cjson.encode({
        value = alert.value,
        errorLevel = alert.errorLevel,
    })

    --- Raise event
    emitEvent(ALERT_TRIGGERED_EVENT, 'id', id, 'data', serialized)

    updateRuleState(newState, id)

    return alertObj
end

--- ??? setState(event, data)
local function updateAlert(id, data)
    local alert = getAlert(id)
    if (alert == nil) then
        error('alert not found: ' .. toStr(id))
    end
    local id = data.id

    local newState
    local update = {
        id = id,
        status = 'open',
        errorLevel = data.errorLevel,
        state = data.state,
        title = data.title or '',
        message = data.message or '',
        failures = rule.failures,
        value = data.value,
    }
    if (data.errorLevel == ERROR_LEVEL_WARNING) then
        newState = RULE_STATE_WARNING
    elseif data.errorLevel == ERROR_LEVEL_CRITICAL then
        newState = RULE_STATE_ERROR
    end

    alert:update(update)

    updateRuleState(newState, id)
end

local function resetCurrentAlert(now)
    local alertId = rule.ruleState.alertId
    if (alertId ~= nil) then
        local alert = RuleAlert.get(alertsKey, alertId)
        if (alert ~= nil) then
            alert.update({
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


local function handleResult(parameter)
    local status = 'ok'
    local data = cmsgpack.unpack(parameter)

    local errorLevel = data.errorLevel

    local errorState

    if (errorLevel == ERROR_LEVEL_NONE) then
        errorState = RULE_STATE_NORMAL
    else
        errorState = (errorLevel == ERROR_LEVEL_WARNING) and RULE_STATE_WARNING or RULE_STATE_ERROR
    end

    local result = rule.handleResult(now, errorState)
    if (result.status == 'ok') then
      if (result.changed) then
        if errorState ~= RULE_STATE_NORMAL then
            local alertId = rule.alertId
            if (not alertId) then
                createAlert(data)
                rule.alertId = data.id
            else
                updateAlert(alertId, data)
            end
        else
            resetCurrentAlert(now)
        end
      end
    end

    --- debug('about to return. Result23 = ', result)
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
    rule:checkStateChange(now)

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
    rule:start(now)
    return handleResult(parameter)
elseif (action == 'start') then
    return rule:start(now)
elseif (action == 'stop') then
    return rule:stop(now)
elseif (action == 'clear') then
    return clearState(now) and 1 or 0
elseif (action == 'alert') then
    return writeAlert(parameter)
elseif (action == 'state') then
    return checkState()
elseif (action == 'mark-notify') then
    return markNotification(now, parameter)
end
