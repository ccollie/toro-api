-------------------------------------------------------------------------------
-- Rule Class
--
-- It returns an object that represents a Rule with the provided JID
-------------------------------------------------------------------------------

--- @include "toBool"
--- @include "isTruthy"
--- @include "debug"
--- @include "hashToArray"
--- @include "RuleAlert"
--- @include "safeJsonDecode"

local HASH_FIELDS = {
    'id',
    'isActive',
    'options',
    'severity',
    'state',
    'channels'
}

local NUMBER_STATE_FIELDS = {
    lastNotify = true,
    alertCount = true,
    failures   = true,
    lastTriggeredAt = true,
    lastFailure = true,
    successes = true,
    warmupStart = true,
}

local NUMBER_OPTION_FIELDS = {
    lastNotify = true,
    failures   = true,
    lastTriggeredAt = true,
    lastFailure = true,
    successes = true,
}

local RULE_STATE_NORMAL = 'NORMAL'
local RULE_STATE_ERROR = 'ERROR'
local RULE_STATE_WARNING = 'WARNING'

local ERROR_LEVEL_NONE = 'NONE'
local ERROR_LEVEL_WARNING = 'CRITICAL'
local ERROR_LEVEL_CRITICAL = 'WARNING'

local CIRCUIT_OPEN = 'OPEN'
local CIRCUIT_CLOSED = 'CLOSED'
local CIRCUIT_HALF_OPEN = 'HALF_OPEN'

local Rule = {
    __hash = {},
    id = ''
}

function rule__getNumberState(self, name, default)
    local state = self.loadState();
    local value = state[name] or default
    return tonumber(value) or default or 0
end

function rule__normalizeOptions(value)
    value = value or {}
    value.warmupWindow = tonumber(value.warmupWindow) or 0
    value.failureThreshold = tonumber(value.failureThreshold) or 0
    value.successThreshold = tonumber(value.successThreshold) or 0
    value.alertThreshold = tonumber(value.alertThreshold) or 0
    value.alertWindow = tonumber(value.alertWindow) or 0
    value.maxAlertsPerEvent = tonumber(value.maxAlertsPerEvent) or 0
    value.notifyInterval = tonumber(value.notifyInterval) or 0
    value.alertOnReset = isTruthy(value.alertOnReset)
    value.recoveryWindow = tonumber(value.recoveryWindow) or 0
    return value
end

Rule.__index = function(self, key)
    if NUMBER_STATE_FIELDS[key] then return rule__getNumberState(self, key) end
    return self[key]
end

local function rule__load(key)
  local rule = redis.call(
      'hmget', key, 'id', 'name', 'description', 'createdAt', 'updatedAt',
      'options', 'condition', 'payload', 'channels', 'queueId', 'metricId', 'isActive',
      'message', 'severity', 'state', 'alertCount', 'totalFailures', 'lastTriggeredAt')

  -- Return nil if we haven't found it
  if not rule[1] then
    return nil
  end

  local data = {
    id   = rule[1],
    name = rule[2],
    description = rule[3],
    createdAt = tonumber(rule[4]) or 0,
    updatedAt = tonumber(rule[5]) or 0,
    options = rule__normalizeOptions( safeJsonDecode(rule[6], {}) ),
    condition = safeJsonDecode(rule[7], {}),
    payload = safeJsonDecode(rule[8], {}),
    channels = safeJsonDecode(rule[9], {}),
    queueId  = rule[10],
    metricId = rule[11] or '',
    isActive = isTruthy(rule[12]),
    message = rule[13] or '',
    severity = rule[14] or '',
    state = rule[15] or RULE_STATE_NORMAL,
    alertCount = tonumber(rule[16]) or 0,
    totalFailures = tonumber(rule[17]) or 0,
    lastTriggeredAt = tonumber(rule[18]) or 0,
  }

  return data
end

-- Return a rule object given its key
function Rule.get(key, stateKey)
  local rule = rule__load(key)
  if (rule == nil) then
    return nil
  end
  rule._stateChanged = false
  rule.ruleStateKey = stateKey
  setmetatable(rule, Rule)
  return rule
end

-- This gets all the data associated with the rule with the provided id. If the
-- rule is not found, it returns nil. If found, it returns an object with the
-- appropriate properties
function Rule:data(...)
  return rule__load(self.key)
end

function Rule:loadState()
    if (not self.ruleState) then
        local state = redis.call('hgetall', ruleStateKey) or {}
        local rs = {}
        for i = 1, #state, 2 do
            rs[state[i]] = state[i+1]
        end
        rs.state = rs.state or CIRCUIT_CLOSED
        rs.lastNotify = tonumber(rs.lastNotify) or 0
        rs.alertCount = tonumber(rs.alertCount) or 0
        rs.failures = tonumber(rs.failures) or 0
        rs.lastTriggeredAt = tonumber(rs.lastTriggeredAt) or 0
        rs.lastFailure = tonumber(rs.lastFailure) or 0
        rs.successes = tonumber(rs.successes) or 0
        self.stateLoaded = true
        self.ruleState = rs
    end
    return self.ruleState
end

function Rule:getOption(name, defaultValue)
   return self.options[name] or defaultValue
end

function Rule:getBoolOption(name, defaultValue)
   if (defaultValue == nil) then defaultValue = false end
   return isTruthy(self:getOption(name, defaultValue))
end

function Rule:shouldNotify(now, oldState)
    local state = self.state
    oldState = oldState or state

    if state == CIRCUIT_CLOSED then
        if (oldState == CIRCUIT_CLOSED) then
            return false
        end
        -- we transitioned from error to normal
        local alertOnReset = self.options.alertOnReset
        if not alertOnReset then
            return false
        end
    end

    local channels = self.channels or {}
    if (type(channels) ~= 'table') or (#channels == 0) then
        return false
    end

    local notifyInterval = self.options.notifyInterval or 0
    if (notifyInterval > 0) then
        debug('checking notifyInterval')
        local lastNotify = self.lastNotify
        if (lastNotify > 0) then
            local delta = now - lastNotify
            if (delta < notifyInterval) then
                return false
            end
        end
    end

    local maxAlertsPerEvent = self.options.maxAlertsPerEvent or 0

    if (maxAlertsPerEvent > 0) and (self.alertCount >= maxAlertsPerEvent) then
        return false
    end

    debug("shouldNotify. at end ")

    return true
end

function Rule:setState(args)
    local n = #args
    assert(n > 0, 'empty arg in Rule:setState')
    local _args = hashToArray(args)
    redis.call('hset', self.ruleStateKey, unpack(_args))
end

function Rule:deleteState(...)
    local args = { ... }
    local n = #args

    if (n == 0) then
        self.ruleState = {}
        return redis.call('del', self.ruleStateKey)
    end
    for i = 1, n do
        local name = args[i]
        self.ruleState[args[i]] = NUMBER_STATE_FIELDS[name] and 0 or nil
    end
    return redis.call('hdel', self.ruleStateKey, unpack(args))
end

function Rule:reset(now)
    local res = false
    local ruleState = self:getRuleState()
    local alertId = ruleState.alertId
    if (alertId ~= nil) then
        local alert = self:getAlert(alertId)
        if (alert ~= nil) then
            alert.resetAt = now
            alert.status = 'CLOSED';
            local serialized = cjson.encode(alert)

            --- Update
            setAlert(alertId, serialized)

            --- Raise event
            emitEvent(ALERT_RESET_EVENT, 'id', alertId, 'data', serialized)
            res = true
        end
    end
    return res
end

function Rule:clearState(now)
    self:reset(now)
    return self:checkStateChange(now)
end

function Rule:isStarted()
    return self:getBoolState('isStarted')
end

function Rule:start(now)
    if (not self:isStarted()) then
        self:clearState()
        self:setState({ isStarted = 1 })
        self:startWarmup(now)
    end
    return 1
end

function Rule:stop()
    if (self:isStarted()) then
        self:clearState()
        self:setState({ isStarted = 0 })
        -- TODO: have 'MUTED' / 'INACTIVE' state
        -- updateRuleState('INACTIVE')
    end
    return 1
end


function Rule:startWarmup(now)
    local warmupWindow = tonumber(self.options.warmupWindow) or 0
    if (warmupWindow > 0) then
        self:setState({ warmupStart = now })
    end
end

--- Returns whether we're currently in the warmup phase
function Rule:isWarmingUp(now)
    local warmupWindow = self.options.warmupWindow or 0
    if (warmupWindow == 0) then return false end
    local warmupStart = tonumber(self.warmupStart) or 0
    return now < (warmupStart + warmupWindow)
end

--- https://java-design-patterns.com/patterns/circuit-breaker/
function Rule:evaluateState(now)
    local failures = self.failures

    local failureThreshold = self.options.failureThreshold or 0

    if (failures >= failureThreshold) then
        local successes = tonumber(self.ruleState.successes) or 0
        local successThreshold = self.options.successThreshold
        if (successThreshold > 0) then
            if (successes >= successThreshold) then
                return CIRCUIT_CLOSED
            end
        elseif successes > 0 then
            return CIRCUIT_CLOSED
        end

        local cooldown = self.options.recoveryWindow or 0
        --debug('Checking cooldown. LastFailure = ', lastFailure, ', cooldown = ', cooldown)
        --debug('Here ',
        --    {
        --        ['cooldown'] = cooldown,
        --        ['now'] = now,
        --        ['lastFailure'] = lastFailure,
        --        ['timeSinceLastFailure'] = now - lastFailure,
        --        ['expired'] = (now - lastFailure) > cooldown
        --    }
        --)
        if  (cooldown > 0) and (now - self.lastFailure) >= cooldown then
            return CIRCUIT_CLOSED
        else
            return CIRCUIT_OPEN
        end
    else
        return CIRCUIT_CLOSED
    end
end

function Rule:checkStateChange(now)
    local ruleState = self.ruleState

    self.ruleState.state = self.ruleState.state or CIRCUIT_CLOSED
    local oldState = ruleState.state
    local state = self:evaluateState()

    local changed = false
    if (ruleState.state ~= state) then
        local newRuleState = ruleState.errorType

        local args = {state = state}

        ruleState.state = state
        if (state == CIRCUIT_OPEN) then
            -- error
            args.lastNotify = 0
            args.successes = 0

            local notificationStart = self.lastNotify
            if (notificationStart == 0) then
                args.lastNotify = now
                args.lastTriggeredAt = now
            end
            newRuleState = ruleState['errorType'] or ERROR_LEVEL_CRITICAL
        elseif (state == CIRCUIT_CLOSED) then
            args.failures = 0
            args.alertCount = 0
            self:reset()
            newRuleState = RULE_STATE_NORMAL
        end

        local notifyPending = self:shouldNotify(now, oldState) and 1 or 0
        self.ruleState['notifyPending'] = notifyPending

        args.notifyPending = notifyPending

        if (newRuleState ~= nil) then
            self:updateRuleState(now, newRuleState)
        end

        args = hashToArray(args)
        redis.call('hset', self.ruleStateKey, unpack(args))
        if (state == CIRCUIT_CLOSED) then
            self:deleteState('warmupStart', 'lastNotify', 'alertId', 'successes', 'errorType', 'lastFailure')
        end

        changed = true
    end
    return state, changed
end

--- TODO: when we are in a triggered state, increment the count on the currently open alert
--- as well as on the rule
function Rule:handleFailure(now, errorType)
    local totalFailures = self.totalFailures + 1
    local failures = self.failures + 1
    self:setState({
        failures = failures,
        totalFailures = totalFailures,
        lastFailure = now,
        errorType = errorType,
        successes = 0
    })
    return self:checkStateChange(now)
end

function Rule:handleSuccess(now)
    local successes = self.successes + 1
    self:setState({ successes = successes })
    return self:checkStateChange(now)
end

function Rule:handleResult(now, parameter)
    local status = 'ok'

    local result = {}

    if (parameter == ERROR_LEVEL_NONE) then
        errorType = RULE_STATE_NORMAL
    else
        errorType = (parameter == ERROR_LEVEL_WARNING) and RULE_STATE_WARNING or RULE_STATE_ERROR
    end

    if (not self.isActive) then
        status = 'inactive'
    else
        if self:isWarmingUp(now) then
            result['endDelay'] = now + (self.options.warmupWindow or 0)
            status = 'warmup'
            debug('warming up....')
        else
            local newState, changed = (errorType == RULE_STATE_NORMAL) and self:handleSuccess(now) or self:handleFailure(now, errorType)
            if (changed) then
                local alertId = self:getState('alertId',  '')
                if (#alertId > 0) then
                    result['alertId'] = alertId
                end
            end
            resuult['changed'] = changed
            result['state'] = newState
            result['failures'] = self.failures
            result['successes'] = self.successes
            result['alertCount'] = self.alertCount
            result['notify'] = tonumber(self.ruleState.notifyPending) or 0
        end
    end
    result.status = status

    --- debug('about to return. Result23 = ', result)

    return result
end


-- Update the rule's attributes with the provided dictionary
function Rule:update(data)
  local tmp = {}
  for k, v in pairs(data) do
    table.insert(tmp, k)
    table.insert(tmp, v)
  end
  redis.call('hmset', self.key, unpack(tmp))
end

-- Return whether or not this job exists
function Rule:exists()
  return redis.call('exists', self.key) == 1
end
