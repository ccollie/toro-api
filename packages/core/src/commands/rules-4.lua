---
--- Generated by EmmyLua(https://github.com/EmmyLua)
--- Created by ccollie.
--- DateTime: 4/20/21 10:44 AM
---
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

local HASH_FIELDS = {
    'id',
    'isActive',
    'options',
    'severity',
    'state',
    'channels'
}

local ALERT_TRIGGERED_EVENT = 'alert.triggered'
local ALERT_RESET_EVENT = 'alert.reset'
local STATE_CHANGED = 'rule.state-changed'
local RULE_STATE_NORMAL = 'NORMAL'
local RULE_STATE_ERROR = 'ERROR'
local RULE_STATE_WARNING = 'WARNING'

local ERROR_LEVEL_NONE = 'NONE'
local ERROR_LEVEL_WARNING = 'CRITICAL'
local ERROR_LEVEL_CRITICAL = 'WARNING'

local CIRCUIT_OPEN = 'OPEN'
local CIRCUIT_CLOSED = 'CLOSED'
local CIRCUIT_HALF_OPEN = 'HALF_OPEN'

local SEPARATOR = '|'

local ruleKey = KEYS[1]
local ruleStateKey = KEYS[2]
local alertsKey = KEYS[3]
local busKey = KEYS[4]

local now = tonumber(ARGV[2] or 0)
local action = assert(ARGV[3], 'missing "action" argument')
local parameter = ARGV[4]
local errorType = nil

local rule = {}
local ruleState = {}
local result = {}
local isLoaded = false
local debug_flag = true

local ASCII_ZERO = 48
-- From internet sleuthing. This is apparently not in the docs
local MAX_INTEGER = 9007199254740994

local function isNil(val)
    return (val == cjson.null) or ('nil' == type(val))
end

local function isArray(t)
    local isNil = isNil
    if (type(t) ~= 'table') then
        return false
    end
    local i = 1
    for _, v in pairs(t) do
        -- note: explicitly check against nil here !!!
        -- for arrays coming from JSON, we can have cjson.null, which we
        -- want to support
        if (type(_) ~= 'number' or isNil(t[i])) then
            return false
        end
        i = i + 1
    end
    return true
end

local dblQuote = function(v)
    return '"' .. v .. '"'
end

local function toStr(value, ...)
    -- local v;
    if (isNil(value)) then
        return 'null'
    end
    local str = '';
    local t = type(value)
    if (t == 'string') then
        return value
    elseif (t == 'boolean') then
        return (value and 'true' or 'false')
    elseif t == 'nil' then
        return 'nil'
    elseif (t == 'number') then
        return value .. ''
    elseif (t == 'table') then
        local delims = { '{', '}' }
        if isArray(value) then
            delims = { '[', ']' }
        end
        str = delims[1]
        for k, v in pairs(value) do
            local s = (t == 'string') and dblQuote(v) or toStr(v, ...)
            if type(k) == 'number' then
                str = str .. s .. ', '
            else
                str = str .. dblQuote(k) .. ': ' .. s .. ', '
            end
        end
        str = str:sub(0, #str - 2) .. delims[2]
    end
    return str
end

local function debug(msg, ...)
    if (debug_flag) then
        local str = ''
        local args = { ... }
        for i = 1, #args do
            str = str .. toStr(args[i])
        end
        redis.call('rpush', 'rules-debug', toStr(msg), str)
    end
end

local function toBool(value)
    local bool = false
    local t = type(value)
    if (t == 'string') then
        if (value == 'true' or value == '1') then
            return true
        end
        if (value == 'false' or value == '0') then
            return false
        end
        return #value > 0
    elseif t == 'boolean' then
        bool = value
    elseif (t == 'number') then
        bool = value ~= 0
    end
    return bool
end

--- does s only contain digits?
-- @string s a string
local function isDigit(s)
    return string.find(s,'^%d+$') == 1
end

local function isString(s)
    return type(s) == 'string'
end

local function arrayHashAppend(arr, ...)
    local arg = { ... }
    local n = #arg
    assert(math.mod(n, 2) == 0, 'Number of arguments must be even')

    for i = 1, n, 2 do
        table.insert(arr, arg[i])
        table.insert(arr, arg[i + 1])
    end
end

local function split(source, sep)
    local start, ending = string.find(source, sep or SEPARATOR, 1, true)
    local timestamp = source:sub(1, start - 1)
    local value = source:sub(ending + 1)
    return timestamp, value
end

local function encodeValue(ts, data, is_hash)
    if (is_hash == true) then
        data = cjson.encode(data)
    end
    return tostring(ts) .. SEPARATOR .. data
end

local function decodeValue(raw_value)
    local ts, block = split(raw_value)
    return ts, block
end

local function storeValue(timestamp, value, is_hash)
    local val = encodeValue(timestamp, value, is_hash)
    redis.call('ZADD', alertsKey, 0, val)
    return val
end

local function incrementTimestamp(val)
    local isString = isString
    local isDigit = isDigit

    local num = tonumber(val)
    if (num == nil) or (num >= MAX_INTEGER) then
        val = tostring(val)
        if (isString(val) and isDigit(val)) then
            -- bigint/snowflake id
            local j = #val
            local carry = 1
            local right = ''
            while j > 1 do
                local digit = val:byte(j) - ASCII_ZERO
                digit = digit + carry
                if (digit > 9) then
                    carry = digit - 9
                    right = '0' .. right
                else
                    right = digit .. right
                    break
                end
                j = j - 1
            end
            local res = val:sub(1, j - 1) .. right
            return res
        end
    else
        return num + 1
    end
    return assert(false, "timestamp must be a number. got: " .. tostring(val))
end

local stateLoaded = false
local function loadState()
    if not stateLoaded then
        local state = redis.call('HGETALL', ruleStateKey) or {}
        ruleState = {}
        for i = 1, #state, 2 do
            ruleState[state[i]] = state[i+1]
        end
        ruleState.state = ruleState.state or CIRCUIT_CLOSED
        stateLoaded = true
    end
    return ruleState
end

local function loadRule()
    if isLoaded == false then
        loadState()
        local values = redis.call('HMGET', ruleKey, unpack(HASH_FIELDS))
        local len = #values
        rule = {}
        for i = 1, len do
            rule[HASH_FIELDS[i]] = values[i]
        end

        local opts = rule.options
        if (type(opts) == 'string') then
            rule.opts = assert(cjson.decode(opts), 'No job options specified ')
        else
            rule.opts = {}
        end
        if (type(rule.channels) == 'string') then
            rule.channels = cjson.decode(rule.channels)
        else
            rule.channels = {}
        end
        rule.isActive = toBool(rule.isActive)
        isLoaded = true
        --- debug(rule)
    end
end

local function getOption(name, defaultValue)
    return rule.opts[name] or defaultValue
end

local function getNumberOption(name, defaultValue)
    local result = tonumber(rule.opts[name] or defaultValue)
    return result ~= nil and result or defaultValue
end

local function getState(name, defaultValue)
    return ruleState[name] or defaultValue
end

local function getNumberState(name, defaultValue)
    return tonumber(ruleState[name]) or defaultValue
end

local function setState(...)
    local ruleState = ruleState
    local arg = { ... }
    local n = #arg
    assert(math.mod(n, 2) == 0, 'Number of arguments must be even')

    for i = 1, n, 2 do
        local name = arg[i]
        ruleState[name] = arg[i+1]
    end
    redis.call('hset', ruleStateKey, unpack(arg))
end

local function deleteState(...)
    local args = { ... }
    local n = #args

    if (n == 0) then
        ruleState = {}
        return redis.call('del', ruleStateKey)
    end
    for i = 1, n do
        ruleState[args[i]] = nil
    end
    return redis.call('hdel', ruleStateKey, unpack(args))
end

local function incrState(name)
    local val = tonumber(ruleState[name]) or 0
    val = val + 1
    setState(name, val)
    return val
end

local function getFailures()
    return getNumberState('failures', 0)
end

local function getLastFailure()
    return getNumberState('lastFailure', 0)
end

local function startWarmup()
    setState('warmupStart', now)
end

--- Returns whether we're currently in the warmup phase
local function isWarmingUp()
    local warmupWindow = getNumberOption('warmupWindow', 0)
    local warmupStart = getNumberState('warmupStart', 0)
    return now < (warmupStart + warmupWindow)
end

local function emitEvent(event, ...)
    local args = { ... }
    redis.call("XADD", busKey, "*", "event", event, "ruleId", rule.id, "ts", now, unpack(args))
    --- todo: trim
end

local function updateRuleState(state)
    if (rule.state ~= state) then
        -- set state and raise event
        rule.state = state
        local args = {'state', state}

        if (state == RULE_STATE_NORMAL) then
            arrayHashAppend(args, 'lastResolvedAt', now)
        else
            arrayHashAppend(args, 'lastTriggeredAt', now)
        end

        redis.call('hset', ruleKey, unpack(args))

        emitEvent(STATE_CHANGED, unpack(args))
    end
end

local function fetchAlert(id)
    id = id or getState('alertId')
    if (id == nil) or (#id == 0) then
        return nil
    end
    local min = '[' .. tostring(id) .. SEPARATOR
    local max = '(' .. tostring(incrementTimestamp(id)) .. SEPARATOR

    local ra = redis.call('zrangebylex', alertsKey, min, max, 'limit', 0, 2)
    if ra ~= nil and #ra == 1 then
        local raw_value = ra[1]
        local ts, value = decodeValue(raw_value)
        return {
            ts = ts,
            value = value,
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

-- Set the value associated with *id*
local function setAlert(id, value)
    local current = fetchAlert(id)
    -- remove old value
    if (current ~= nil) then
        redis.call("zrem", alertsKey, current.raw_value)
    end

    storeValue(id, value, false)

    local alertCount = redis.call('zcard', alertsKey)
    --- update rule alert count
    redis.call('hset', ruleKey, 'alertCount', alertCount)
end

local function getAlert(id)
    local current = fetchAlert(id)
    if (current ~= nil) then
        return cjson.decode(current.value)
    end
    return nil
end

local function shouldNotify(oldState)
    local getOpt = getNumberOption
    local state = ruleState.state
    oldState = oldState or state

    if state == CIRCUIT_CLOSED then
        if (oldState == CIRCUIT_CLOSED) then
            return false
        end
        -- we transitioned from error to normal
        local alertOnReset = toBool( getOption('alertOnReset', false) )
        if not alertOnReset then
            return false
        end
    end

    local channels = rule['channels'] or {}
    if (not isArray(channels)) or (#channels == 0) then
        return false
    end

    local notifyInterval = getOpt('notifyInterval',  0)
    if (notifyInterval > 0) then
        debug('checking notifyInterval')
        local lastNotify = getNumberState('lastNotify', 0)
        if (lastNotify > 0) then
            local delta = now - lastNotify
            if (delta < notifyInterval) then
                return false
            end
        end
    end

    local alertCount = getNumberState('alertCount', 0)
    local maxAlertsPerEvent = getOpt('maxAlertsPerEvent', 0)

    if (maxAlertsPerEvent > 0) and (alertCount >= maxAlertsPerEvent) then
        return false
    end

    debug("shouldNotify. at end ")

    return true
end

--- ??? setState(event, data)
local function writeAlert(parameter)
    if (not rule.isActive) then
        return '{}'
    end
    local data = cjson.decode(parameter)
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
        failures = getFailures(),
        value = data.value,
        raisedAt = now
    }
    if (data.errorLevel == ERROR_LEVEL_WARNING) then
        newState = RULE_STATE_WARNING
    elseif data.errorLevel == ERROR_LEVEL_CRITICAL then
        newState = RULE_STATE_ERROR
    end

    setState('alertId', id)

    local serialized = cjson.encode(alert)

    --- create an entry compatible with timeseries-1.lua
    --- Note: this works because id passed in is actually a snowflake id compatible with a long int
    setAlert(id, serialized)

    --- Raise event
    emitEvent(ALERT_TRIGGERED_EVENT, 'id', id, 'data', serialized)

    updateRuleState(newState)

    return serialized
end

--- https://java-design-patterns.com/patterns/circuit-breaker/
local function calculateState()
    local getOpt = getNumberOption
    local failures = getFailures()

    local failureThreshold = getOpt('failureThreshold',  0)

    if (failures >= failureThreshold) then
        local successes = getNumberState('successes', 0)
        local successThreshold = getOpt('successThreshold', 0)
        if (successThreshold > 0) then
            if (successes >= successThreshold) then
                return CIRCUIT_CLOSED
            end
        elseif successes > 0 then
            return CIRCUIT_CLOSED
        end

        local lastFailure = getLastFailure()
        local cooldown = getNumberOption('recoveryWindow', 0)
        --debug('Checking cooldown. LastFailure = ', lastFailure, ', cooldown = ', cooldown)
        --debug('Heere ',
        --    {
        --        ['cooldown'] = cooldown,
        --        ['now'] = now,
        --        ['lastFailure'] = lastFailure,
        --        ['timeSinceLastFailure'] = now - lastFailure,
        --        ['expired'] = (now - lastFailure) > cooldown
        --    }
        --)
        if  (cooldown > 0) and (now - lastFailure) >= cooldown then
            return CIRCUIT_CLOSED
        else
            return CIRCUIT_OPEN
        end
    else
        return CIRCUIT_CLOSED
    end
end

local function resetAndCloseCircuit()
    local result = false
    local alertId = ruleState.alertId
    if (alertId ~= nil) then
        local alert = getAlert(alertId)
        if (alert ~= nil) then
            alert.resetAt = now
            alert.status = 'CLOSED';
            local serialized = cjson.encode(alert)

            --- Update
            setAlert(alertId, serialized)

            --- Raise event
            emitEvent(ALERT_RESET_EVENT, 'id', alertId, 'data', serialized)
            result = true
        end
    end
    return result
end

local function updateCircuit()
    local ruleState = ruleState

    ruleState.state = ruleState.state or CIRCUIT_CLOSED
    local oldState = ruleState.state
    local state = calculateState()

    local changed = false
    if (ruleState.state ~= state) then
        local newRuleState = ruleState.errorType

        local args = {'state', state}

        ruleState.state = state
        if (state == CIRCUIT_OPEN) then
            arrayHashAppend(args, 'lastNotify', 0, 'successes', 0)
            local notificationStart = getNumberState('lastNotify', 0)
            if (notificationStart == 0) then
                arrayHashAppend(args, 'lastNotify', now, 'lastTriggeredAt', now)
            end
            newRuleState = ruleState['errorType'] or ERROR_LEVEL_CRITICAL
        elseif (state == CIRCUIT_CLOSED) then
            arrayHashAppend(args, 'failures', 0, 'alertCount', 0)
            resetAndCloseCircuit()
            newRuleState = RULE_STATE_NORMAL
        end

        local notifyPending = shouldNotify(oldState) and 1 or 0
        ruleState['notifyPending'] = notifyPending

        arrayHashAppend(args, 'notifyPending', notifyPending)

        if (newRuleState ~= nil) then
            updateRuleState(newRuleState)
        end

        redis.call('hset', ruleStateKey, unpack(args))
        if (state == CIRCUIT_CLOSED) then
            deleteState('warmupStart', 'lastNotify', 'alertId', 'successes', 'errorType', 'lastFailure')
        end

        changed = true
    end
    return state, changed
end

--- TODO: when we are in a triggered state, increment the count on the currently open alert
--- as well as on the rule
local function handleFailure(errorType)
    local totalFailures = getNumberState('totalFailures', 0)
    setState(
        'errorType', errorType,
        'lastFailure', now,
        'failures', getFailures() + 1,
        'successes', 0,
        'totalFailures', totalFailures + 1
    )
    -- redis.call('hset', ruleKey, 'failures', totalFailures + 1)
end

local function handleSuccess()
    incrState('successes')
end

local function setResult(...)
    arrayHashAppend(result, ...)
end

local function checkNotify(parameter)
    local getOpt = getNumberOption
    local status = 'ok'

    result = {}

    if (parameter == ERROR_LEVEL_NONE) then
        errorType = RULE_STATE_NORMAL
    else
        errorType = (parameter == ERROR_LEVEL_WARNING) and RULE_STATE_WARNING or RULE_STATE_ERROR
    end

    if (not rule.isActive) then
        status = 'inactive'
    else
        if isWarmingUp() then
            setResult('endDelay', now + getOpt('warmupWindow', 0))
            status = 'warmup'
            debug('warming up....')
        else
            if (errorType == RULE_STATE_NORMAL) then
                handleSuccess()
            else
                handleFailure(errorType)
            end
            local newState, changed = updateCircuit()
            if (changed) then
                local alertId = getState('alertId',  '')
                if (#alertId > 0) then
                    setResult('alertId', alertId)
                end
            end
            setResult(
                'state', newState,
                'failures', getFailures(),
                'successes', getNumberState('successes', 0),
                'alertCount', getNumberState('alertCount', 0),
                'notify', getNumberState('notifyPending', 0)
            )
        end
    end
    setResult('status', status)
    --- debug('about to return. Result23 = ', result)

    return result
end

local function markNotification(alertId)
    local getOpt = getNumberOption

    local currAlertId = ruleState['alertId']
    if (currAlertId ~= alertId) then
        if (currAlertId ~= nil) then

        end
    end
    local alertCount = getNumberState('alertCount', 0)
    local doNotify = toBool(getNumberState('notifyPending', 0))
    if doNotify then
        alertCount = alertCount + 1
        setState('lastNotify', now, 'alertCount', alertCount, 'notifyPending', 0)
        local maxAlertsPerEvent = getOpt('maxAlertsPerEvent', 0)
        if (maxAlertsPerEvent > 0) then
            local remaining = math.min(0, maxAlertsPerEvent - alertCount)
            setResult('remaining', remaining)
        end
        local interval = getOpt('notifyInterval', 0)
        if (interval > 0) then
            setResult('nextEarliest', now + interval)
        end
    end
    setResult('notified', doNotify, 'alertCount', alertCount)
    return result
end

local function checkState()
    if (rule == nil) then
        return {'status', 'not_found'}
    end
    updateCircuit()
    local res = {'isActive', rule.isActive, 'ruleState', rule.state}
    for k, v in pairs(ruleState) do
        table.insert(res, k)
        table.insert(res, v)
    end
    return res
end

local function clearState()
    resetAndCloseCircuit()
    updateCircuit()
end

local function isStarted()
    return toBool(getState('isStarted', false))
end

local function start()
    if (isStarted() == false) then
        setState('isStarted', '1')
        clearState()
        startWarmup()
    end
    return 1
end

local function stop()
    if (isStarted()) then
        setState('isStarted', '0')
        clearState()
        -- TODO: have 'MUTED' / 'INACTIVE' state
        -- updateRuleState('INACTIVE')
    end
    return 1
end

loadRule()
if (action == 'check') then
    start()
    return checkNotify(parameter)
elseif (action == 'start') then
    return start()
elseif (action == 'stop') then
    return stop()
elseif (action == 'clear') then
    return clearState() and 1 or 0
elseif (action == 'alert') then
    return writeAlert(parameter)
elseif (action == 'state') then
    return checkState()
elseif (action == 'mark-notify') then
    return markNotification(parameter)
end