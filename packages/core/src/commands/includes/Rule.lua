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

local RULE_STATE_NORMAL = 'NORMAL'
local RULE_STATE_ERROR = 'ERROR'
local RULE_STATE_WARNING = 'WARNING'

local ERROR_STATUS_NONE = 'NONE'
local ERROR_STATUS_WARNING = 'WARNING'
local ERROR_STATUS_ERROR = 'ERROR'

local CIRCUIT_OPEN = 'OPEN'
local CIRCUIT_CLOSED = 'CLOSED'
local CIRCUIT_HALF_OPEN = 'HALF_OPEN'

local RUN_STATE_ACTIVE = 'active'
local RUN_STATE_INACTIVE = 'inactive'
local RUN_STATE_MUTED = 'muted'
local RUN_STATE_WARMUP = 'warmup'


local function rule__getNumberState(self, name, default)
    local state = self:loadState();
    local val = tonumber(state[name])
    return val and val or default or 0
end

local Rule = {
-- __index = function(self, key)
--     if NUMBER_STATE_FIELDS[key] then return rule__getNumberState(self, key) end
--     return rawget(self, key)
-- end
}
Rule.__index = Rule

local function rule__normalizeOptions(value)
    value = value or {}
    value.warmupWindow = tonumber(value.warmupWindow) or 0
    value.failureThreshold = tonumber(value.failureThreshold) or 0
    value.successThreshold = tonumber(value.successThreshold) or 0
    value.alertThreshold = tonumber(value.alertThreshold) or 0
    value.alertWindow = tonumber(value.alertWindow) or 0
    value.maxAlertsPerEvent = tonumber(value.maxAlertsPerEvent) or 0
    value.notifyInterval = tonumber(value.notifyInterval) or 0
    value.alertOnReset = toBool(value.alertOnReset)
    value.recoveryWindow = tonumber(value.recoveryWindow) or 0
    return value
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
    isActive = toBool(rule[12]),
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
  rule.ruleStateKey = stateKey
  rule.key = key
  return setmetatable(rule, Rule)
end

-- This gets all the data associated with the rule with the provided id. If the
-- rule is not found, it returns nil. If found, it returns an object with the
-- appropriate properties
function Rule:data(...)
  return rule__load(self.key)
end

function Rule:loadState()
    if (not self.ruleState) then
        local state = redis.call('hgetall', self.ruleStateKey) or {}
        local rs = {}
        for i = 1, #state, 2 do
            rs[state[i]] = state[i+1]
        end
        rs.errorStatus = rs.errorStatus or RULE_STATE_NORMAL
        rs.circuitState = rs.circuitState or CIRCUIT_CLOSED
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
   return toBool(self:getOption(name, defaultValue))
end

function Rule:shouldNotify(now, oldState)
    local state = self.ruleState.circuitState
    oldState = oldState or state

    if state == CIRCUIT_CLOSED then
        if (oldState == CIRCUIT_CLOSED) then
            return false
        end
        -- we transitioned from error to normal
        if not self.options.alertOnReset then
            return false
        end
    end

    local channels = self.channels or {}
    if (type(channels) ~= 'table') or (#channels == 0) then
        return false
    end

    local notifyInterval = self.options.notifyInterval or 0
    if (notifyInterval > 0) then
        local lastNotify = self.ruleState.lastNotify
        if (lastNotify > 0) then
            local delta = now - lastNotify
            if (delta < notifyInterval) then
                return false
            end
        end
    end

    local maxAlertsPerEvent = self.options.maxAlertsPerEvent or 0
    local alertCount = self.ruleState.alertCount

    if (maxAlertsPerEvent > 0) and (alertCount >= maxAlertsPerEvent) then
        return false
    end

    return true
end

function Rule:setState(args)
    local arr = {}
    for k, v in pairs(args) do
        table.insert(arr, k)
        table.insert(arr, v)
        if (NUMBER_STATE_FIELDS[k]) then
            self.ruleState[k] = tonumber(v) or 0
        else
            self.ruleState[k] = v
        end
    end
    redis.call('hset', self.ruleStateKey, unpack(arr))
end

function Rule:reset(now)
    local res = false
    --- todo: reset the state of the rule
    return res
end

function Rule:clearState(now)
    self:reset(now)
    return self:recalcState(now)
end

function Rule:isStarted()
    return toBool(self.ruleState.isStarted)
end

function Rule:start(now)
    if (not self.isActive) then
        return RUN_STATE_INACTIVE
    end
    if (not self:isStarted()) then
        self:clearState(now)
        self:setState({ isStarted = 1 })
        self:startWarmup(now)
    end
    if (self:isWarmingUp(now)) then
        return RUN_STATE_WARMUP
    else
       return RUN_STATE_ACTIVE
    end
end

function Rule:stop(now)
    if (not self.isActive) then
        return RUN_STATE_INACTIVE
    end
    if (self:isStarted()) then
        self:clearState(now)
        self:setState({ isStarted = 0 })
    end
    return RUN_STATE_INACTIVE
end


function Rule:startWarmup(now)
    local warmupWindow = tonumber(self.options.warmupWindow) or 0
    if (warmupWindow > 0) then
        self:setState({ warmupStart = now })
    end
end

--- Returns whether we're currently in the warmup phase
function Rule:isWarmingUp(now)
    if (not self:isStarted()) then
        return false
    end
    local warmupWindow = self.options.warmupWindow or 0
    if (warmupWindow == 0) then return false end
    local warmupStart = tonumber(self.ruleState.warmupStart) or 0
    return now < (warmupStart + warmupWindow)
end

--- https://java-design-patterns.com/patterns/circuit-breaker/
function Rule:evaluateCircuit(now)
    local failures = self.ruleState.failures or 0
    local failureThreshold = self.options.failureThreshold or 0

    if (failures >= failureThreshold) then
        local successes = self.ruleState.successes
        local successThreshold = self.options.successThreshold
        if (successThreshold > 0) then
            if (successes >= successThreshold) then
                return CIRCUIT_CLOSED
            end
        elseif successes > 0 then
            return CIRCUIT_CLOSED
        end

        local cooldown = self.options.recoveryWindow
        local lastFailure = self.ruleState.lastFailure
--         debug('Checking cooldown. LastFailure = ', lastFailure, ', cooldown = ', cooldown)
--         debug('Here ',
--            {
--                ['cooldown'] = cooldown,
--                ['now'] = now,
--                ['lastFailure'] = lastFailure,
--                ['timeSinceLastFailure'] = now - lastFailure,
--                ['expired'] = (now - lastFailure) > cooldown
--            }
--         )
        if  (cooldown > 0) and (now - lastFailure) >= cooldown then
            return CIRCUIT_CLOSED
        else
            return CIRCUIT_OPEN
        end
    else
        return CIRCUIT_CLOSED
    end
end

function Rule:recalcState(now, errorStatus)
    errorStatus = errorStatus or self.ruleState.errorStatus
    local oldCircuitState = self.ruleState.circuitState or CIRCUIT_CLOSED
    local circuitState = self:evaluateCircuit(now)
    self.ruleState.circuitState = circuitState

    local changed = false
    if (oldCircuitState ~= circuitState) then
        changed = true
        local args = { circuitState = circuitState, successes = 0, alertId = '', warmupStart = 0 }

        args.notifyPending = self:shouldNotify(now, oldCircuitState) and 1 or 0

        local ruleState, tsKey

        if (circuitState == CIRCUIT_OPEN) then
            -- error
            args.lastNotify = 0

            local notificationStart = self.ruleState.lastNotify
            if (notificationStart == 0) then
                if (args.notifyPending) then
                    args.lastNotify = now
                end
                args.lastTriggeredAt = now
            end
            tsKey = 'lastTriggeredAt'
            args.errorStatus = errorStatus or ERROR_STATUS_ERROR
            ruleState = (args.errorStatus == ERROR_STATUS_ERROR) and RULE_STATE_ERROR or RULE_STATE_WARNING
        elseif (circuitState == CIRCUIT_CLOSED) then
            args.failures = 0
            args.alertCount = 0
            args.errorStatus = ERROR_STATUS_NONE
            args.lastFailure = 0
            self:reset()
            tsKey = 'lastResolvedAt'
            ruleState = RULE_STATE_NORMAL
        end

        self:setState(args)

        args = { state = ruleState }
        args[tsKey] = now
        self:update(args)
    end
    return circuitState, changed
end

--- TODO: when we are in a triggered state, increment the count on the currently open alert
--- as well as on the rule
function Rule:handleFailure(now, errorStatus)
    local totalFailures = rule__getNumberState(self, 'totalFailures') + 1
    local failures = rule__getNumberState(self, 'failures') + 1
    self:setState({
        failures = failures,
        totalFailures = totalFailures,
        lastFailure = now,
        errorStatus = errorStatus,
        successes = 0
    })
    self:update({ totalFailures = totalFailures })
    return self:recalcState(now, errorStatus)
end

function Rule:handleSuccess(now)
    local successes = tonumber(self.ruleState.successes) + 1
    self:setState({ successes = successes })
    return self:recalcState(now)
end

function Rule:handleResult(now, errorStatus)
    local status = RUN_STATE_ACTIVE

    local result = { circuitState = self.ruleState.circuitState }

    if (not self.isActive) then
        status = RUN_STATE_INACTIVE
    else
        if self:isWarmingUp(now) then
            result.endDelay = now + (self.options.warmupWindow or 0)
            status = RUN_STATE_WARMUP
        else
            local newState, changed
            if (errorStatus == ERROR_STATUS_NONE) then
                newState, changed = self:handleSuccess(now)
            else
                newState, changed = self:handleFailure(now, errorStatus)
            end

            if (changed) then
                local alertId = self.ruleState.alertId
                if (type(alertId) == 'string' and (#alertId > 0)) then
                    result.alertId = alertId
                end
            end

            result['errorStatus'] = self.ruleState.errorStatus
            result['changed'] = changed
            result['state'] = newState
            result['failures'] = rule__getNumberState(self, 'failures')
            result['successes'] = rule__getNumberState(self, 'successes')
            result['alertCount'] = rule__getNumberState(self, 'alertCount')
            result['notify'] = rule__getNumberState(self, 'notifyPending')
            result['ruleState'] = self.state
        end
    end
    result.status = status
    return result
end

-- Update the rule's attributes with the provided dictionary
function Rule:update(data)
    local arr = {}
    for k, v in pairs(data) do
        table.insert(arr, k)
        table.insert(arr, v)
        self[k] = v
    end
    redis.call('hmset', self.key, unpack(arr))
end

-- Return whether or not this job exists
function Rule:exists()
  return redis.call('exists', self.key) == 1
end
