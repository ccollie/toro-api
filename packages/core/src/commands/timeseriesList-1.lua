-- TIMESERIES IN REDIS
--
-- Manage timeseries in Redis based on a list
--
-- A timeseries is
--  1) ordered (with respect to timestamps)
--  2) unique (each timestamp is unique within the timeseries)
--  3) associative (it associate a timestamp with a value).
-- Commands are implemented in the *Timeseries* table. To
-- execute a command use EVALSHA as follows
--
--  EVALSHA sha1 1 key add 100000 key value
--  EVALSHA sha1 1 key range 100000 100500 0 25

--- @include "includes/debug"
--- @include "includes/isDigitsOnly"

--- UTILS ------
local rcall = redis.call
local msPerMinute = 60 * 1000

local period = msPerMinute
local defaultValue = 0
local key = KEYS[1]

local metaLoaded = false

local metadata = {
  lastTS = nil,
  firstTS = nil,
  count = 0,
  period = msPerMinute
}

local function getServerTime()
  local val = redis.call('TIME')
  return val[1]
end

local function getMetadata(key)
  if (not metaLoaded) then
    metaLoaded = true
    local arr = rcall('LRANGE', key, -1, -1)
    if (arr and #arr > 0) then
      metadata = cjson.decode(arr[1])
    end
  end
  return metadata
end

-- round n to nearest minute
local function round(n, period, direction)
  local fn = direction == 'up' and math.ceil or math.floor
  return fn(n / period) * period
end

local function updateMetadata(dataPointsList, period, timestamp, isNew)
  local count = rcall("LLEN", dataPointsList)
  if (count > 0) then
    count = count - 1
  end
  local firstTS
  local lastTS = round(timestamp, period)
  if (count == 0) then
    lastTS = nil
    firstTS = nil
  else
    firstTS = lastTS - (count * period)
  end

  metadata = {
    count = count,
    lastTS = lastTS,
    firstTS = firstTS,
    period = period
  }
  local data = cjson.encode(metadata)
  if (isNew) then
    rcall('RPUSH', dataPointsList, data)
    return 1
  else
    rcall('LSET', dataPointsList, -1, data)
    return 0
  end
end


local function shallow_merge(dest, src)
  for k, v in pairs(src) do dest[k] = v end
  return dest
end

local function mapIndex(key, period, ts)
  local metadata = getMetadata(key)
  local last = metadata.lastTS or getServerTime()
  return math.floor((ts - last) / period)
end

local function setData(dataPointsList, period, timestamp, value)
  local metadata = getMetadata(dataPointsList)

  -- Compute how many data points we need to add to the list, N.
  local lastTS = metadata and metadata.lastTS or nil
  local firstTS = metadata.firstTS
  local count = metadata.count or 0
  local isNew = count == 0

  -- todo: reject timestamps before firstTS

  if not lastTS or (lastTS <= 0) then
    -- If lastTS is nil, set it to the current timestamp
    lastTS = timestamp
    firstTS = timestamp
  end

  if (timestamp >= firstTS) and (timestamp <= lastTS) then
    if (isNew) then
      rcall("LPUSH", dataPointsList, value)
      return updateMetadata(dataPointsList, period, timestamp, isNew)
    else
      local index = mapIndex(dataPointsList, period, timestamp)
      rcall("LSET", dataPointsList, index, value)
      return 0
    end
  end

  local N = math.floor((timestamp - lastTS) / period)

  if N > 0 then
    -- If N > 1, add N-1 zeros to the list
    if N > 1 then
      local points = {value}
      for i = 2, N do
        points[i] = defaultValue
      end
      rcall("LPUSH", dataPointsList, unpack(points))
    else
      rcall("LPUSH", dataPointsList, value)
    end
  end

  -- todo: Update metadata
  return updateMetadata(dataPointsList, period, timestamp, isNew)
end

local function getLastTS(key)
  local meta = getMetadata(key)
  return meta.lastTS
end

local function getFirstTS(key)
  local meta = getMetadata(key)
  return meta.firstTS
end

-- From internet sleuthing. This is apparently not in the docs
local MAX_INTEGER = math.huge - 1

local function isSpecialTimestamp(val)
  return val == '*' or val == '-' or val == '+'
end

local function isValidTimestamp(val)
  if (type(val) == 'number') then return true end
  local num = tonumber(val)
  if (num ~= nil) then return true end
  val = tostring(val)
  return isDigitsOnly(val) or isSpecialTimestamp(val)
end

--- PARAMETER PARSING --------
local function assertTimestamp(ts)
  assert(isValidTimestamp(ts), "timestamp must be a number. Got: " .. tostring(ts))
  return ts
end

local function parseTimestamp(ts)
  if (ts == '*') then
    local val = rcall('TIME')
    return val[1]
  elseif (ts == '-') then
    return getFirstTS(key) or 0
  elseif (ts == '+') then
    return getLastTS(key) or MAX_INTEGER
  end
  return assertTimestamp(ts)
end

local function getSingleValue(key, period, timestamp)
  timestamp = parseTimestamp(key, timestamp)
  local index = mapIndex(key, period, timestamp)

  local ra = rcall('lrange', key, index, index)
  if ra ~= nil and #ra == 1 then
    return ra[1]
  end
  return nil
end

local function getKeyValVarargs(method, ...)
  local arg = { ... }
  local n = #arg

  assert(n, 'No values specified for  ' .. method .. '.')
  assert(math.mod(n, 2) == 0, 'Invalid args to ' .. method .. '. Number of arguments must be even')
  return arg
end


-- COMMANDS TABLE
local Timeseries = {
}

Timeseries.__index = Timeseries;

-- Add timestamp,value pair to the Timeseries
function Timeseries.add(key, period, timestamp, value)
  timestamp = parseTimestamp(key, timestamp)
  setData(key, period, timestamp, value)
  return timestamp
end


function Timeseries.bulkAdd(key, period, ...)
  local values = getKeyValVarargs('bulkAdd', ...)
  local len = #values
  local count = 0

  for i = 1, len, 2 do
    local ts = parseTimestamp(values[i])
    -- should be a string
    local val = values[i + 1]
    setData(key, period, ts, val)
    count = count + 1
  end

  return count
end

function Timeseries.size(key)
  local count = rcall('llem', key)
  return count > 0 and (count - 1) or 0
end

-- Check if *timestamp* exists in the timeseries
function Timeseries.exists(key, timestamp)
  local meta = getMetadata(key)
  if (meta.count == 0) then
    return false
  end
  return (timestamp >= meta.firstTS and timestamp <= meta.lastTS)
end

function Timeseries.metadata(key)
  local meta = getMetadata(key)
  return cjson.encode(meta)
end

-- Get the value associated with *timestamp*
function Timeseries.get(key, period, timestamp)
  return getSingleValue(key, period, timestamp)
end

-- Set the value associated with *timestamp*
function Timeseries.set(key, period, timestamp, value)
  assert(value ~= nil, 'timeseries.set: Must specify a value ' .. key .. '(' .. tostring(timestamp) .. ') ')
  return setData(key, period, timestamp, value)
end

-- Merge the value associated with *timestamp* with an update fragment.
-- Does a shallow merge
function Timeseries.updateJson(key, period, timestamp, value)
  timestamp = parseTimestamp(key, timestamp)
  local current = getSingleValue(key, period, timestamp)
  local update = assert(cjson.decode(value),
          'updateJson: Must specify a json encoded string ' .. key .. '(' .. tostring(timestamp) .. ') ')

  if (current ~= nil) then
    local src_table = assert(cjson.decode(current),
            'updateJson: old value is not a valid json encoded string')
    shallow_merge(src_table, update)
    value = cjson.encode(src_table)
  end

  setData(key, period, timestamp, value)
  return value
end

function Timeseries.range(key, period, min, max)
  local rangeStart = parseTimestamp(key, min)
  local rangeEnd = parseTimestamp(key, max)
  local m = getMetadata(key)
  local count = m.count
  if (count == 0) then
    return {}
  end
  local firstTS = m.firstTS
  local lastTs = m.lastTS

  if (rangeEnd == -1 or rangeEnd > lastTs) then
    rangeEnd = lastTs
  end

  local minIndex = mapIndex(key, period, rangeStart)
  local maxIndex = mapIndex(key, period, rangeEnd)
  if (minIndex < 0) then
    minIndex = 0
    rangeStart = firstTS
  end
  if (maxIndex > count) then
    maxIndex = count
  end
  if (minIndex > maxIndex) then
    local temp = minIndex
    minIndex = maxIndex
    maxIndex = temp
  end

  local res = rcall('LRANGE', key, minIndex, maxIndex)
  res[#res + 1] = rangeStart
  return res
end

--[[
  Truncate values so that only the last (latest - retention) values remain
  Input:
    key         key,
    retention   retention time in ms. Items with score < (latest - retention) are removed
  Output:
    the number of items removed
]]
function Timeseries.truncate(key, period, retention)
  retention = assert(tonumber(retention), 'retention value must be a number (ms)')
  local meta = getMetadata(key);
  local last = meta.lastTS
  if (last ~= nil) then
    local count = meta.count
    if (count == 0) then
      return 0
    end
    -- debug("last score " .. tostring(last))
    local max = last - retention - 1
    if (max > 0) then
      local index = mapIndex(key, period, max)
      local removed = rcall('LREM', key, index, count - 1)
      updateMetadata(key, period, last)
      return removed
    end
  end
  return 0
end

local command_name = assert(table.remove(ARGV, 1), 'Timeseries: must provide a command')
local command = Timeseries[command_name]
if (command == nil) then
  error('Timeseries: unknown command ' .. command_name)
end

-- debug('running ' .. command_name .. '(' .. KEYS[1] .. ',' .. table.tostring(ARGV) .. ')')
local result = command(KEYS[1], unpack(ARGV))

return result
