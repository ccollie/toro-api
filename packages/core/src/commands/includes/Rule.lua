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
--- @include "toStr"

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
  endTriggerDelay = true,
  successes = true
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
    value.triggerDelay = tonumber(value.triggerDelay) or 0
    value.endTriggerDelay = tonumber(value.endTriggerDelay) or 0
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

local function rule__normalizeState(rs)
    rs = rs or {}
    rs.errorStatus = rs.errorStatus or RULE_STATE_NORMAL
    rs.circuitState = rs.circuitState or CIRCUIT_CLOSED
    rs.lastNotify = tonumber(rs.lastNotify) or 0
    rs.alertCount = tonumber(rs.alertCount) or 0
    rs.failures = tonumber(rs.failures) or 0
    rs.lastTriggeredAt = tonumber(rs.lastTriggeredAt) or 0
    rs.lastFailure = tonumber(rs.lastFailure) or 0
    rs.successes = tonumber(rs.successes) or 0
    rs.notifications = tonumber(rs.notifications) or 0
    return rs
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
    self.ruleState = rule__normalizeState(rs)
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

local function rule__checkNotify(self, now)
  local canNotify = true
  local result = { status = 'ok', notify = false }

  local circuitState = self.ruleState.circuitState
  if (circuitState == CIRCUIT_CLOSED) and (not self.options.alertOnReset) then
    result.status = 'no_reset_alerts'
    return result
  end

  local channels = self.channels or {}
  if (type(channels) ~= 'table') or (#channels == 0) then
    result.status = 'no_channels'
    return result
  end

  local alertCount = self.ruleState.alertCount or 0
  local maxAlertsPerEvent = tonumber(self.options.maxAlertsPerEvent or 0) or 0
  if (alertCount > 0 and maxAlertsPerEvent > 0) then
    result.remaining = math.max(0, maxAlertsPerEvent - alertCount)
    if (result.remaining == 0) then
      result.status = 'max_alerts_exceeded'
      return result
    end
  end

  local notifyInterval = self.options.notifyInterval or 0
  local lastNotify = tonumber(self.ruleState.lastNotify or 0) or 0
  if (notifyInterval > 0 and lastNotify > 0 and canNotify) then
    result.nextEarliest = now + notifyInterval
    local delta = now - lastNotify
    if (delta < notifyInterval) then
      result.nextEarliest = lastNotify + notifyInterval + 1
      result.status = 'notify_interval_exceeded'
      return result
    end
  end

  result.notify = true
  return result
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

function Rule:activate(now)
  if (not self.isActive) then
    self:clearState(now)
    self:setState({ isActive = 1 })
  end
 return RUN_STATE_ACTIVE
end

function Rule:deactivate(now)
  if (not self.isActive) then
    return RUN_STATE_INACTIVE
  end
  self:clearState(now)
  self:setState({ isActive = 0 })
  return RUN_STATE_INACTIVE
end

-- assumes that failures > 0
local function rule__checkCooldown(rule, now)
  local cooldown = rule.options.recoveryWindow
  if (cooldown > 0) then
    local lastFailure = rule.ruleState.lastFailure
    if (lastFailure > 0) then
      local delta = now - lastFailure
      return delta >= cooldown and CIRCUIT_CLOSED or CIRCUIT_OPEN
    end
  end
  return false
end

--- https://java-design-patterns.com/patterns/circuit-breaker/
function Rule:evaluateCircuit(now)
  local failures = self.ruleState.failures or 0
  local failureThreshold = self.options.failureThreshold or 0
  local delay = self.options.triggerDelay or 0

  if (delay > 0 and failures > 0) then
    if (failures == 1) then
      self:setState({ endTriggerDelay = now + delay })
      return CIRCUIT_CLOSED
    else
      local endDelay = tonumber(self.ruleState.endTriggerDelay or 0) or 0
      if (now < endDelay) then
        return CIRCUIT_CLOSED
      end
    end
  end

  if (failures < failureThreshold) then
    return CIRCUIT_CLOSED
  end

  debug('here: state = ' .. toStr(self.ruleState))
  local successes = tonumber(self.ruleState.successes or 0) or 0
  local successThreshold = self.options.successThreshold or 0
  if (successes > 0 and successes >= successThreshold) then
    debug('here: successes = ' .. toStr(successes) .. ', successThreshold = ' .. toStr(successThreshold))
    local recovered = rule__checkCooldown(self, now)

    if (recovered ~= false) then
      return recovered
    end

    self:setState({ failures = 0, successes = 0 })
    return CIRCUIT_CLOSED
  end

  local recovered = rule__checkCooldown(self, now)

  if (recovered ~= false) then
    return recovered
  end

  return CIRCUIT_OPEN
end

function Rule:recalcState(now, errorStatus)
    errorStatus = errorStatus or self.ruleState.errorStatus
    local oldCircuitState = self.ruleState.circuitState or CIRCUIT_CLOSED
    local circuitState = self:evaluateCircuit(now)
    self.ruleState.circuitState = circuitState

    debug('here. Old state = ', oldCircuitState, ', new state = ', circuitState)
    local changed = false
    if (oldCircuitState ~= circuitState) then
      changed = true
      local args = { circuitState = circuitState, successes = 0, alertId = '' }

      --- see if we should notify
      local res = rule__checkNotify(self, now)

      args.notifyPending = res.notify and 1 or 0
      if (res.status == 'notify_interval_exceeded') then
        args.earliestNotification = res.nextEarliest
      end

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
        errorStatus = errorStatus,
        successes = 0
    })
    self:update({ totalFailures = totalFailures })
    local state, changed = self:recalcState(now, errorStatus)
    self:setState({ lastFailure = now })
    return state, changed
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
    result.status = status
    return result
end

function Rule:notify(now)
    local result = rule__checkNotify(self, now)
    local alertCount = self.ruleState.alertCount or 0

    if result.shouldNotify then
        alertCount = alertCount + 1
        self:setState({
            lastNotify = now,
            alertCount = alertCount,
            notifyPending = 0
        })
    end

    result.shouldNotify = nil
    result.notified = result.shouldNotify
    result.alertCount = alertCount

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
