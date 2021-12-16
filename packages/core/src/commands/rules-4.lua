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
--- @include "includes/destructureJobKey"

local ALERT_TRIGGERED_EVENT = 'alert.triggered'
local ALERT_RESET_EVENT = 'alert.reset'
local STATE_CHANGED = 'rule.state-changed'

local ruleKey = KEYS[1] or ''
local ruleStateKey = KEYS[2]
local alertsKey = KEYS[3]
local busKey = KEYS[4]

local now = tonumber(ARGV[1] or 0)
local action = assert(ARGV[2], 'missing "action" argument')
local parameter = ARGV[3]

local rule

local rcall = redis.call

local function loadRule()
    if not rule then
        rule = Rule.get(ruleKey, ruleStateKey)
        if (rule == nil) then
            local id = getJobIdFromKey(ruleKey)
            error('rule not found: ' .. toStr(id or ruleKey))
        end
        rule:loadState()
        --- todo: error if not found
    end
    return rule
end


local function emitEvent(event, ...)
    local args = { ... }
    --- debug('event ', event, ' rule Id= "' .. toStr(rule.id) .. '" ', 'args=' .. cjson.encode(args))
    rcall("XADD", busKey, "*", "__evt", event, "ruleId", rule.id, "ts", now, unpack(args))
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

    --- Raise event
    local args = { id = id, errorLevel = alert.errorLevel }
    emitEvent(ALERT_TRIGGERED_EVENT, unpack(args))

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

local function resetAlert(now, id)
    local alert = RuleAlert.get(alertsKey, id)
    if (alert == nil) then
        error('alert not found: ' .. toStr(id))
    end
    -- todo: check alert state ???? Also set state on rule itself
    if (alert:reset(now)) then
        emitEvent(ALERT_RESET_EVENT, 'id', id)
        return true
    end
    return false
end

local function resetCurrentAlert(now)
    local alertId = rule.ruleState.alertId
    if (alertId ~= nil) then
        local ok, result = pcall(resetAlert, now, alertId)
        return ok and result or false
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

        local eventArgs = { 'oldState', saveState, 'newState', rule.state }
        if (result.alertId) then
            table.insert(eventArgs, 'alertId')
            table.insert(eventArgs, result.alertId)
        end
        emitEvent(STATE_CHANGED, unpack(eventArgs))
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
    local result = rule:notify(now)
    return hashToArray(result)
end

local function checkState(now)
    if (rule == nil) then
        return {'status', 'not_found'}
    end
    local newState, changed = rule:recalcState(now)
    if (changed and newState == CIRCUIT_CLOSED) then
        resetCurrentAlert(now)
    end
    local res = hashToArray(rule.ruleState)
    local len = #res
    res[len + 1] = 'isActive'
    res[len + 2] = rule.isActive
    res[len + 3] = 'ruleState'
    res[len + 4] = rule.state

    return res
end

local function clearState(now)
    resetCurrentAlert(now)
    return rule:checkStateChange(now)
end

--- todo: deleteAlert
--- todo: make this into a dispatch table
loadRule()
if (action == 'check') then
    local evalData = cmsgpack.unpack(parameter)
    return handleResult(now, evalData)
elseif (action == 'state') then
    return checkState(now)
elseif (action == 'activate') then
    return rule:activate(now)
elseif (action == 'deactivate') then
    return rule:deactivate(now)
elseif (action == 'clear') then
    return clearState(now) and 1 or 0
elseif (action == 'reset-alert') then
    return resetAlert(now, parameter) and 1 or 0
elseif (action == 'alert') then
    local alertData = cmsgpack.unpack(parameter)
    local alert = createAlert(alertData)
    local data = alert:getData()
    return cjson.encode(data)
elseif (action == 'mark-notify') then
    return markNotification(now, parameter)
end
