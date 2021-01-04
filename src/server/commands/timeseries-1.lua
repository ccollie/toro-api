-- TIMESERIES IN REDIS
--
-- Stand-alone Lua script for managing an timeseries in Redis based on lexicographically sorted sets
--
-- A timeseries is an
--  1) ordered (with respect to timestamps)
--  2) unique (each timestamp is unique within the timeseries)
--  3) associative (it associate a timestamp with a value).
-- Commands are implemented in the *Timeseries* table. To
-- execute a command use EVALSHA as follows
--
--  EVALSHA sha1 1 key add 100000 key value
--  EVALSHA sha1 1 key range 100000 100500 0 25

local function ts_debug(msg)
  redis.call('rpush', 'ts-debug', msg)
end

--- UTILS ------
local utils = {}
local find = string.find

function utils.isString(s)
  return type(s) == 'string'
end

--- does s only contain digits?
-- @string s a string
function utils.isdigit(s)
  assert(1,s)
  return find(s,'^%d+$') == 1
end

function utils.isNil(s)
  return type(s) == nil
end

function utils.isNumber(s)
  return type(s) == 'number'
end

function utils.isBoolean(s)
  return type(s) == 'boolean'
end

function utils.isTable(s)
  return type(s) == 'table'
end

function utils.isFunction(s)
  return type(s) == 'function'
end

function utils.isArray(t)
  if (type(t) ~= 'table') then
    return false
  end
  local i = 0
  for _ in pairs(t) do
    i = i + 1
    -- note: explicitly check against nil here !!!
    -- for arrays coming from JSON, we can have cjson.null, which we
    -- want to support
    if (t[i] == nil) then
      return false
    end
  end
  return true
end

function utils.dblQuote(v)
  return '"' .. v .. '"'
end

function utils.tostring(value, ...)
  local str = ''
  if utils.isString(value) then
    return value
  elseif (utils.isBoolean(value)) then
    return (value and 'true' or 'false')
  elseif utils.isNil(value) then
    return 'nil'
  elseif utils.isNumber(value) then
    return value .. ''
  elseif (utils.isFunction(value)) then
    return utils.tostring(value(...))
  elseif (utils.isTable(value)) then
    local delims = { '{', '}' }
    if utils.isArray(value) then
      delims = { '[', ']' }
    end
    str = delims[1]
    for k, v in pairs(value) do
      v = utils.isString(v) and utils.dblQuote(v) or utils.tostring(v, ...)
      if utils.isNumber(k) then
        str = str .. v .. ', '
      else
        str = str .. utils.dblQuote(k) .. ': ' .. v .. ', '
      end
    end
    str = str:sub(0, #str - 2) .. delims[2]
  end
  return str
end

local SEPARATOR = '|'

local function shallow_merge(dest, src)
  for k, v in pairs(src) do dest[k] = v end
  return dest
end

local function tableMerge(t1, t2)
  for k,v in pairs(t2) do
    if type(v) == "table" then
      if type(t1[k] or false) == "table" then
        tableMerge(t1[k] or {}, t2[k] or {})
      else
        t1[k] = v
      end
    else
      t1[k] = v
    end
  end
  return t1
end

local function split(source, sep)
  local start, ending = string.find(source, sep or SEPARATOR, 1, true)
  local timestamp = source:sub(1, start - 1)
  local value = source:sub(ending + 1)
  return timestamp, value
end

local function encode_value(ts, data, is_hash)
  if (is_hash == true) then
    data = cjson.encode(data)
  end
  return tostring(ts) .. SEPARATOR .. data
end

local function decode_value(raw_value)
  local ts, block = split(raw_value)
  return ts, block
end

local function store_value(key, timestamp, value, is_hash)
  local val = encode_value(timestamp, value, is_hash)
  redis.call('zadd', key, 0, val)
  return val
end

local function getLastScore(key)
  local val = redis.call('zrevrangebylex', key, '+', '-', 'limit', 0, 1)
  if val and #val > 0 then
    return split(val[1])
  end
  return nil
end

local function getFirstScore(key)
  local val = redis.call('zrangebylex', key, '-', '+', 'limit', 0, 1)
  if val and #val > 0 then
    return split(val[1])
  end
  return nil
end

local ASCII_ZERO = 48
-- From internet sleuthing. This is apparently not in the docs
local MAX_INTEGER = 9007199254740994

local function isSpecialTimestamp(val)
  return val == '*' or val == '-' or val == '+'
end

local function isValidTimestamp(val)
  if (utils.isNumber(val)) then return true end
  local num = tonumber(val)
  if (num ~= nil) then return true end
  val = tostring(val)
  return utils.isdigit(val) or isSpecialTimestamp(val)
end

local function incrementTimestamp(val)
  local num = tonumber(val)
  if (num == nil) or (num >= MAX_INTEGER) then
    val = tostring(val)
    if (utils.isString(val) and utils.isdigit(val)) then
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

--- PARAMETER PARSING --------
local function assertTimestamp(ts)
  assert(isValidTimestamp(ts), "timestamp must be a number. Got: " .. utils.tostring(ts))
  return ts
end

local function parse_timestamp(ts)
  if (ts == '*') then
    local val = redis.call('TIME')
    return val[1]
  end
  return assertTimestamp(ts)
end

local function parse_timestamp_value(key, ts)
  if (ts == '*') then
    local val = redis.call('TIME')
    return val[1]
  elseif (ts == '-') then
    return getFirstScore(key) or 0
  elseif (ts == '+') then
    return getLastScore(key) or (MAX_INTEGER - 2)
  end
  return assertTimestamp(ts)
end

local function parse_timestamp_ex(key, ts, allowRangeChars)
  if (ts == '*') then
    local val = redis.call('TIME')
    return val[1]
  elseif (ts == '-') or (ts == '+') then
    assert(allowRangeChars, 'invalid timestamp for key "' .. key .. '"')
    return ts
  end
  return assertTimestamp(ts)
end

local function parse_range_min_max(key, timestamp1, timestamp2, addSeparator)
  local min_val = parse_timestamp_ex(key, timestamp1, true)
  local max_val = parse_timestamp_ex(key, timestamp2, true)
  local sep = (addSeparator or false) and SEPARATOR or ''

  local min, max = min_val, max_val

  if not isSpecialTimestamp(min) then
    min = '[' .. tostring(min) .. sep
  end

  if not isSpecialTimestamp(max) then
    max = '(' .. tostring(max) .. sep
  end

  return {
    min = min,
    max = max
  }
end

local function get_key_val_varargs(method, ...)
  local arg = { ... }
  local n = #arg

  assert(n, 'No values specified for  ' .. method .. '.')
  assert(math.mod(n, 2) == 0, 'Invalid args to ' .. method .. '. Number of arguments must be even')
  return arg
end

local PARAMETER_OPTIONS = {
  LIMIT = 1
}

local COPY_OPTIONS = {
  LIMIT = 1
}

local function parse_range_params(key, valid_options, min, max, ...)
  local result = parse_range_min_max(key, min, max)

  valid_options = valid_options or PARAMETER_OPTIONS

  local arg = { ... }
  local i = 1

  --- ts_debug('args = ' .. table.tostring(arg))
  --- [LIMIT count]
  while i < #arg do
    local option_name = assert(arg[i], 'range: no option specified')
    option_name = string.upper(option_name)

    if (not valid_options[option_name]) then
      local j = 0
      local str = ''
      for k, _ in pairs(valid_options) do
        if str:len() > 0 then
          str = str .. ', '
        end
        str = str .. k
        j = j + 1
      end
      error('Invalid option "' .. option_name .. '". Expected one of ' .. str)
    end

    i = i + 1
    if (option_name == 'LIMIT') then
      assert(not result.limit, 'A value for limit has already been set')

      result.limit = {
        offset = 0
      }
      -- we should have offset, count
      result.limit.offset = assert(tonumber(arg[i]), 'LIMIT: offset value must be a number')
      assert(result.limit.offset >= 0, "LIMIT: offset must be 0 or positive")

      result.limit.count = assert(tonumber(arg[i + 1]), 'LIMIT: count value must be a number')

      i = i + 2
    end
  end

  return result
end

local function process_range(range)
  local decode = decode_value

  local result = {}
  local i = 1
  for _, value in ipairs(range) do
    local ts, val = decode(value)
    if val ~= nil then
      result[i] = { ts, val }
      i = i + 1
    end
  end
  return result
end

local function get_single_value(key, timestamp, name)
  timestamp = parse_timestamp_value(key, timestamp)
  local min = '[' .. tostring(timestamp) .. SEPARATOR
  local max = '(' .. tostring(incrementTimestamp(timestamp)) .. SEPARATOR

  local ra = redis.call('zrangebylex', key, min, max, 'limit', 0, 2)
  if ra ~= nil and #ra == 1 then
    local raw_value = ra[1]
    local ts, value = decode_value(raw_value)
    return {
      ts = ts,
      value = value,
      raw_value = raw_value
    }
  elseif #ra > 1 then
    error(
    'Multiple values for timeseries.' .. name .. '. key: "' .. key ..'", ' ..
    'ts: ' .. utils.tostring(timestamp)
    )
  end
  return nil
end

local function base_range(cmd, key, params)
  local fetch_params = { key, params.min, params.max }
  if (params.limit) then
    fetch_params[#fetch_params + 1] = 'LIMIT'
    fetch_params[#fetch_params + 1] = params.limit.offset
    fetch_params[#fetch_params + 1] = params.limit.count
  end
  return redis.call(cmd, unpack(fetch_params))
end

-- COMMANDS TABLE
local Timeseries = {
}

Timeseries.__index = Timeseries;


-- Add timestamp,value pair to the Timeseries
function Timeseries.add(key, timestamp, value)
  timestamp = parse_timestamp_ex(key, timestamp, false)
  store_value(key, timestamp, value, false)
  return timestamp
end


function Timeseries.bulkAdd(key, ...)
  local values = get_key_val_varargs('bulkAdd', ...)
  local len = #values
  local count = 0

  for i = 1, len, 2 do
    local ts = parse_timestamp(values[i])
    -- should be a string
    local val = values[i + 1]
    store_value(key, ts, val, false)
    count = count + 1
  end

  return count
end

function Timeseries.del(key, ...)
  local args = { ... }
  assert(#args > 0, "At least one item must be specified for del")

  local values = {}
  local count = 0

  for _, timestamp in ipairs(args) do
    local ts = parse_timestamp_value(key, timestamp)
    local min = '[' .. tostring(ts) .. SEPARATOR
    local max = '(' .. tostring(incrementTimestamp(ts)) .. SEPARATOR
    --- local range = parse_range_min_max(key, timestamp, timestamp, true)
    local entries = redis.call('zrangebylex', key, min, max)
    if entries and #entries then
      for _, raw_value in ipairs(entries) do
        count = count + 1
        values[count] = raw_value
      end
    end
  end

  if count == 0 then
    return 0
  end

  return redis.call('zrem', key, unpack(values))
end

function Timeseries.size(key)
  return redis.call('zcard', key)
end

-- Count the number of elements between *min* and *max*
function Timeseries.count(key, min, max, ...)
  local params = parse_range_params(key,{}, min, max, ...)
  return redis.call('zlexcount', key, params.min, params.max)
end

-- Check if *timestamp* exists in the timeseries
function Timeseries.exists(key, timestamp)
  local value = get_single_value(key, timestamp, 'exists')
  return value ~= nil and 1 or 0
end

function Timeseries.span(key)
  local count = redis.call('zcard', key)
  if count == 0 then
    return {}
  end
  local firstTs = getFirstScore(key)
  local lastTs = getLastScore(key)

  return { firstTs, lastTs }
end

--[[
  Find gaps > a given interval in a sorted set.
  Input:
    key         sorted set key
    startScore  start score
    end         end score
    interval    interval time in ms
    max         max number of items to return at a time
  Output:
    gaps in items as a list of [start, end]
]]
function Timeseries.gaps(key, startScore, endScore, interval, max)
  max = tonumber(max) or 250
  local params = parse_range_params(key,{}, startScore, endScore)
  interval = assert(tonumber(interval), 'interval value must be a number (ms)')
  local ids = {}
  local lastSetIndex = -10
  local range = redis.call('zrangebylex', key, params.min, params.max)

  -- ts_debug(tostring(key) .. '[' .. tostring(params.min) .. ',' .. tostring(params.max) ..']')
  -- ts_debug('count [' .. tostring(#range) .. ']')

  local count, diff = 0, 0
  local score, prev = 0, 0
  for k, value in ipairs(range) do
    local _s, _ = split(value)
    score = tonumber(_s)
    diff = score - prev

    if (k > 1) and (diff > interval) then
      local len = #ids
      --- consolidate consecutive gaps
      if (k - lastSetIndex == 1) then
        ids[len] = score
      else
        if (count + 1) > max then
          break
        end
        count = count + 1
        --- add a new gap
        ids[len + 1] = prev
        ids[len + 2] = score
      end
      lastSetIndex = k
    end
    prev = score
  end
  return ids
end

function Timeseries._get(remove, key, timestamp)
  local entry = get_single_value(key, timestamp, 'get')
  if entry then
    if (remove) then
      redis.call("zrem", key, entry.raw_value)
    end
    return entry.value
  end
end

-- Get the value associated with *timestamp*
function Timeseries.get(key, timestamp)
  return Timeseries._get(false, key, timestamp)
end

-- Remove and return the value associated with *timestamp*
function Timeseries.pop(key, timestamp)
  return Timeseries._get(true, key, timestamp)
end

-- Set the value associated with *timestamp*
function Timeseries.set(key, timestamp, value)
  local current = get_single_value(key, timestamp, 'set')
  assert(value ~= nil, 'timeseries.set: Must specify a value ' .. key .. '(' .. utils.tostring(timestamp) .. ') ')

  -- remove old value
  if (current ~= nil) then
    redis.call("zrem", key, current.raw_value)
  end

  return store_value(key, timestamp, value, false)
end

-- Merge the value associated with *timestamp* with an update fragment.
-- Does a shallow merge
function Timeseries.updateJson(key, timestamp, value)
  timestamp = parse_timestamp_ex(key, timestamp)
  local current = get_single_value(key, timestamp, 'updateJson')
  local update = assert(cjson.decode(value),
          'updateJson: Must specify a json encoded string ' .. key .. '(' .. tostring(timestamp) .. ') ')

  if (current ~= nil) then
    local src_table = assert(cjson.decode(current.value),
            'updateJson: old value is not a valid json encoded string')
    shallow_merge(src_table, update)
    value = cjson.encode(src_table)
    -- remove old value
    redis.call("zrem", key, current.raw_value)
  end

  store_value(key, timestamp, value, false)

  return value
end

function Timeseries._range(remove, cmd, key, min, max, ...)
  local params = parse_range_params(key, PARAMETER_OPTIONS, min, max, ...)
  local data = base_range(cmd, key, params)
  if data and #data > 0 then
    local range = process_range(data, params)
    if remove then
      remove_values(key, data)
    end
    return range
  end

  return {}
end

-- Remove and return a range between *min* and *max*
function Timeseries.poprange(key, min, max, ...)
  return Timeseries._range(true, 'zrangebylex', key, min, max, ...);
end

-- The list of timestamp-value pairs between *min* and *max* with optional offset and count
function Timeseries.range(key, min, max, ...)
  return Timeseries._range(false,'zrangebylex', key, min, max, ...)
end

-- The descending list of timestamp-value pairs between *timestamp1* and *max* with optional offset and count
function Timeseries.revrange(key, min, max, ...)
  return Timeseries._range(false,'zrevrangebylex', key, min, max, ...)
end

local function remove_values(key, values)
  if values and #values > 0 then
    return redis.call('zrem', key, unpack(values))
  end
  return 0
end

-- Remove a range between *min* and *max*
function Timeseries.remrange(key, min, max, ...)
  local params = parse_range_params(key,{ LIMIT = 1 }, min, max, ...)
  if (params.limit == nil) then
    return redis.call('zremrangebylex', key, params.min, params.max)
  end
  local data = base_range('zrangebylex', key, params)
  return remove_values(key, data)
end

--[[
  Truncate values so that only the last (latest - retention) values remain
  Input:
    key         key,
    retention   retention time in ms. Items with score < (latest - retention) are removed
  Output:
    the number of items removed
]]
function Timeseries.truncate(key, retention)
  retention = assert(tonumber(retention), 'retention value must be a number (ms)')
  local last = getLastScore(key)
  if (last ~= nil) then
    -- ts_debug("last score " .. tostring(last))
    local max = last - retention - 1
    if (max > 0) then
      -- ts_debug("max " .. tostring(max))
      return Timeseries.remrange(key, '-', max)
    end
  end
  return 0
end

-- increment value(s) at key(s)
--- incrby(key, ts, name1, value1, name2, value2, ...)
function Timeseries.incrBy(key, timestamp, ...)
  local current = get_single_value(key, timestamp, 'incrBy')

  local hash = {}
  if (current ~= nil) then
    hash = cjson.decode(current.value)
    assert(type(hash) == "table", 'incrBy. The value at ' .. key .. '(' .. tostring(timestamp) .. ') is not a hash')
  end

  local values = get_key_val_varargs('incrby', ...)

  local len, count = #values, 0
  local result = {}
  for i = 1, len, 2 do
    local name = values[i]
    local increment = tonumber(values[i + 1]) or 0
    hash[name] = tonumber(hash[name] or 0) + increment
    count = count + 1
    result[count] = hash[name]
  end

  -- remove old value
  if (current ~= nil) then
    redis.call("zrem", key, current.value)
  end

  return store_value(key, timestamp, hash, true)
end


local function storeTimeseries(dest, range)
  for _, val in ipairs(range) do
    local ts = val[1]
    local data = val[2]
    store_value(dest, ts, data, false)
  end
  return #range
end

--- copy data from a timeseries and store it in another key
function Timeseries.copy(key, dest, min, max, ...)

  local params = parse_range_params(key, COPY_OPTIONS, min, max, ...)
  local data = base_range('zrangebylex', key, params)

  if (#data == 0) then
    return 0
  end

  for _, val in ipairs(data) do
    redis.call('zadd', dest, 0, val)
  end

  return #data
end

--- Merge the data from 2 timeseries and store it in another key
function Timeseries.merge(firstKey, secondKey, dest, min, max, ...)

  local function update_result(result, range)
    local i = #result + 1
    for _, value in ipairs(range) do
      local ts, val = split(value)
      if val ~= nil then
        result[i] = { ts, val }
        i = i + 1
      end
    end
    return result
  end

  local function merge(first, second)
    local result = update_result({}, first)
    update_result(result, second)

    table.sort(result, function(a, b) return a[1] < b[1] end)
    return result
  end

  local MERGE_OPTIONS = {
    LIMIT = 1
  }

  local params = parse_range_params(firstKey, MERGE_OPTIONS, min, max, ...)
  local first = base_range('zrangebylex', firstKey, params)
  local second = base_range('zrangebylex', secondKey, params)
  local merged = merge(first, second)
  if (#merged) then
    storeTimeseries(dest, merged)
  end
  return #merged
end
---------
local UpperMap

local command_name = assert(table.remove(ARGV, 1), 'Timeseries: must provide a command')
local command = Timeseries[command_name]
if (command == nil) then
  if UpperMap == nil then
    UpperMap = {}
    for name, func in pairs(Timeseries) do
      if name:sub(1, 1) ~= '_' then
        UpperMap[name:upper()] = func
      end
    end
  end
  command_name = string.upper(command_name)
  command = UpperMap[command_name]
end
if (command == nil) then
  error('Timeseries: unknown command ' .. command_name)
end

-- ts_debug('running ' .. command_name .. '(' .. KEYS[1] .. ',' .. table.tostring(ARGV) .. ')')

if (command_name == 'copy') or (command_name == 'COPY') then
  return command(KEYS[1], KEYS[2], unpack(ARGV))
elseif (command_name == 'merge') or (command_name == 'MERGE') then
  return command(KEYS[1], KEYS[2], KEYS[3], unpack(ARGV))
end

local result = command(KEYS[1], unpack(ARGV))

return result
