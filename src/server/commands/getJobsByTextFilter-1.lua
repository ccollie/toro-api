--[[
  Get Jobs by filter criteria
     Input:
        KEYS[1] Queue / Name Set Key
        ARGV[1] Key Prefix
        ARGV[2] filter criteria as a json encoded string
        ARGV[3] cursor
        ARGV[4] count
]]

local ADMIN_KEYS = {
  ['wait'] = 1,
  ['waiting'] = 1,
  ['events'] = 1,
  ['meta'] = 1,
  ['active'] = 1,
  ['completed'] = 1,
  ['failed'] = 1,
  ['stalled'] = 1,
  ['delayed'] = 1,
  ['paused'] = 1,
  ['repeat'] = 1,
  ['id'] = 1,
}

local JsType = {
  NULL = 'nil',
  STRING = 'string',
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  FUNCTION = 'function',
  OBJECT = 'object',
  ARRAY = 'array'
}
-- no array, object, or function types
local JS_SIMPLE_TYPES = {
  ['string'] = true,
  ['null'] = true,
  ['nil'] = true,
  ['boolean'] = true,
  ['number'] = true,
}

--- UTILITY -----------------------------------------------------------------------------

--- https://lua.programmingpedia.net/en/tutorial/5829/pattern-matching
local IDENTIFIER_PATTERN = "[%a_]+[%a%d_]*"
local OPERATOR_NAME_PATTERN = "^$" .. IDENTIFIER_PATTERN

-- Check whether the given name passes for an operator. We assume any field name
-- starting with '$' is an operator. This is cheap and safe to do since keys beginning
-- with '$' should be reserved for internal use.
-- @param {String} name
local function isOperator(name)
  return string.match(name, OPERATOR_NAME_PATTERN) ~= nil
end

local function isString(val)
  return type(val) == 'string'
end

local function isNil(val)
  return type(val) == 'nil' or val == cjson.null
end

local function isNumber(val)
  return type(val) == 'number'
end

local function isFunction(val)
  return type(val) == 'function'
end

local function isObject(val)
  return type(val) == 'table'
end

local function isArray(t)
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

local function isEqual(o1, o2, ignore_mt)
  local ty1 = type(o1)
  local ty2 = type(o2)
  if ty1 ~= ty2 then
    -- special case handling of nil
    if (isNil(o1) and isNil(o2)) then
      return true
    end
    return false
  end

  -- non-table types can be directly compared
  if ty1 ~= 'table' then
    return o1 == o2
  end

  -- as well as tables which have the metamethod __eq
  local mt = getmetatable(o1)
  if not ignore_mt and mt and mt.__eq then
    return o1 == o2
  end

  for k1, v1 in pairs(o1) do
    local v2 = o2[k1]
    if isNil(v2) or not isEqual(v1, v2, ignore_mt) then
      return false
    end
  end
  for k2, v2 in pairs(o2) do
    local v1 = o1[k2]
    if isNil(v1) then
      return false
    end
  end
  return true
end

local function getType(val)
  if (val == cjson.null) then
    return JsType.NULL
  end
  local t = type(val)
  if (t == 'table') then
    return isArray(val) and JsType.ARRAY or JsType.OBJECT
  end
  return t
end

local function keys(obj)
  local res = {}
  for k, v in pairs(obj) do
    res[#res + 1] = k
  end
  return res
end

-- Create a new table of values by mapping each value in table through a transformation function
-- @param obj {table}
-- @param callback {function}
-- @return {*}
local function map(obj, callback)
  assert(isObject(obj), 'expected an array in map')

  local accumulator = {}

  for _, current in ipairs(obj) do
    table.insert(accumulator, callback(current, _))
  end

  return accumulator
end

local function slice(array, start, stop)
  start = start or 1
  stop = stop or #array
  local t = {}
  for i = start, stop do
    t[i - start + 1] = array[i]
  end
  return t
end

---- Casting --------------------------------------------------

local function tonum(value, ...)
  local num = 0
  local t = type(value)
  if t == 'string' then
    local ok = pcall(function()
      num = value + 0
    end)
    if not ok then
      num = math.huge
    end
  elseif (t == 'boolean') then
    num = value and 1 or 0
  elseif (t == 'number') then
    num = value
  elseif (t == 'function') then
    num = tonum(value(...))
  end
  return num
end

local dblQuote = function(v)
  return '"' .. v .. '"'
end

local function tostr(value, ...)
  local str = '';
  local t = type(value)
  -- local v;
  if (t == 'string') then
    return value
  elseif (t == 'boolean') then
    return (value and 'true' or 'false')
  elseif isNil(value) then
    return 'nil'
  elseif (t == 'number') then
    return value .. ''
  elseif (t == 'function') then
    return tostr(value(...))
  elseif (t == 'table') then
    local delims = { '{', '}' }
    if isArray(value) then
      delims = { '[', ']' }
    end
    str = delims[1]
    for k, v in pairs(value) do
      v = isString(v) and dblQuote(v) or tostr(v, ...)
      if isNumber(k) then
        str = str .. v .. ', '
      else
        str = str .. dblQuote(k) .. ': ' .. v .. ', '
      end
    end
    str = str:sub(0, #str - 2) .. delims[2]
  end
  return str
end

local function debug(msg)
  redis.call('rpush', 'search-debug', tostr(msg))
end

-- raw value should be a kv table [name, value, name, value ...]
-- convert to an associative array
local function to_hash(value)
  local len, result = #value, {}
  for k = 1, len, 2 do
    result[value[k]] = value[k + 1]
  end
  return result
end


--
-- Resolve the value of the field (dot separated) on the given object
-- @param obj {Object} the object context
-- @param selector {String} dot separated path to field
-- @param {ResolveOptions} options
-- @returns {*}
--
local function resolve(obj, segments, unwrapArray)
  local depth = 0

  --
  -- Unwrap a single element array to specified depth
  -- @param {Array} arr
  -- @param {Number} depth
  --
  local function unwrap(arr, depth)
    if (depth < 1) then
      return arr
    end
    while (depth > 0 and #arr == 1) do
      arr = arr[1]
      depth = depth - 1
    end
    return arr
  end

  local function resolve2(o, path)
    local value = o
    local index = 1
    -- debug('resolving path ' .. tostr(path) .. ' in object ' .. tostr(o))

    while (index <= #path) do
      local field = path[index]

      if (type(value) == 'table') then
        local numIndex = tonumber(field)

        if (isArray(value)) then
          -- handle instances like
          -- value: { grades: [ { score: 10, max: 100 }, { score:5, max: 10 } ] }
          -- path: 'score'
          if (numIndex == nil) then
            -- On the first iteration, we check if we received a stop flag.
            -- If so, we stop to prevent iterating over a nested array value
            -- on consecutive object keys in the selector.
            if (index == 1 and depth > 0) then
              break
            end
            depth = depth + 1

            path = slice(path, index)
            local acc = {}
            for _, item in ipairs(value) do
              local v = resolve2(item, path)
              if not isNil(v) then
                acc[#acc + 1] = v
              end
            end
            value = acc
            break
          else
            field = (numIndex + 1)
          end
        end
        value = value[field]
      else
        value = nil
      end

      -- debug(field .. ':' .. tostr(value) .. ', ' .. tostr(index) .. '/' .. tostr(#path))

      index = index + 1
      if isNil(value) then
        break
      end
    end
    return value
  end

  local t = type(obj)
  if (t == 'table') then
    obj = resolve2(obj, segments, 1)
    if (unwrapArray) then
      obj = unwrap(obj, depth)
    end
  end

  return obj
end


-- Returns a predicate function that matches
-- *all* of the given predicate functions.
local function join_AND(predicates)
  if (#predicates == 1) then
    return predicates[1]
  end
  return function(s)
    for _, func in ipairs(predicates) do
      if not func(s) then
        return false
      end
    end
    return true
  end
end

---- PREDICATES ------------------------------------------------------------------------
local Predicates = {}
Predicates.__index = Predicates


---- QUERY OPERATORS -------------------------------------------------------------------
--
-- Simplify expression for easy evaluation with query operators map
-- @param expr
-- @returns {*}
local function normalize(expr)
  -- normalized primitives
  local t = getType(expr)
  if (JS_SIMPLE_TYPES[t]) then
    return { ['$eq'] = expr }
  end

  -- normalize object expression
  if (isObject(expr)) then

    local hasOperator = false
    for k, _ in pairs(expr) do
      if (isOperator(k)) then
        hasOperator = true
        break
      end
    end

    -- no valid query operator found, so we do simple comparison
    if (not hasOperator) then
      return { ['$eq'] = expr }
    end

  end

  return expr
end

local QueryOperators = {}
QueryOperators.__index = QueryOperators

local function compileQuery(criteria)
  assert(type(criteria) == 'table', 'query criteria must be an object')

  local compiled = {}

  local function processOperator(field, operator, value)
    local operatorFn = QueryOperators[operator]
    assert(operatorFn ~= nil, 'invalid query operator "' .. operator .. '" found');
    compiled[#compiled + 1] = operatorFn(field, value)
  end

  local function parse(criteria)
    for field, expr in pairs(criteria) do

      if ('$expr' == field) then
        processOperator(field, field, expr);
      elseif (field == '$and' or field == '$or' or field == '$nor') then
        processOperator(field, field, expr)
      else
        --- normalize expression
        local expr = normalize(expr)

        for op, val in pairs(expr) do
          assert(isOperator(op), 'unknown top level operator: "' .. op .. '"')
          processOperator(field, op, val)
        end
      end

    end

    assert(#compiled > 0, 'empty criteria: ' .. tostr(criteria))
    return join_AND(compiled)
  end

  return parse(criteria)
end


local function split (str, sep)
  local sep, fields = sep or ".", {}
  local pattern = string.format("([^%s]+)", sep)
  str:gsub(pattern, function(c)
    fields[#fields + 1] = c
  end)
  return field
end

local fieldHandlers = {}
local referencedFields = {}

local function getFieldResolver(field)
  local handler = fieldHandlers[field]
  if (handler == nil) then
    local path = split(field, '.')
    local segment = #path > 0 and path[1] or field
    referencedFields[segment] = true
    handler = function(obj)
      local val = resolve(obj, path)
      -- debug('value: ' .. tostr(val))
      return isnum and tonumber(val) or val
    end
  end
  fieldHandlers[field] = handler
  return handler
end

--- EXPRESSION OPERATORS -------------------------------------------------------------
local ExprOperators = {}
ExprOperators.__index = ExprOperators

--
-- Parses an expression and returns a function which returns
-- the actual value of the expression using a given object as context
--
-- @param {table} expr the expression for the given field
-- @param {string} operator the operator to resolve the field with
-- @returns {function}
--
local function parseExpression(expr, operator)

  -- debug('parsing ' .. tostr(expr))

  local function parseArray()
    local compiled = {}
    for _, item in ipairs(expr) do
      compiled[#compiled + 1] = parseExpression(item)
    end
    return function(obj)
      local result = {}
      for _, fn in ipairs(compiled) do
        local v = fn(obj)
        result[#result + 1] = (v == nil) and cjson.null or v
      end
      return result
    end
  end

  local function parseObject()
    local compiled = {}
    for key, val in pairs(expr) do
      compiled[key] = parseExpression(val, key)
      -- must run ONLY one aggregate operator per expression
      -- if so, return result of the computed value
      if (ExprOperators[key] ~= nil) then
        -- there should be only one operator
        local _keys = keys(expr)
        -- debug('key: ' .. key.. ', Keys: ' .. tostr(_keys))
        assert(#_keys == 1, 'Invalid aggregation expression "' .. tostr(expr) .. '".')
        compiled = compiled[_keys[1]]
      end
    end

    if (isFunction(compiled)) then
      return compiled
    end

    return function(obj)
      local result = {}
      for key, fn in pairs(compiled) do
        local v = fn(obj)
        result[key] = (v == nil) and cjson.null or v
      end
      return result
    end
  end

  -- if the field of the object is a valid operator
  if (operator and ExprOperators[operator] ~= nil) then
    return ExprOperators[operator](expr);
  end

  -- if expr is a variable for an object field
  if (isString(expr) and #expr > 1 and expr:sub(1, 1) == '$') then
    local field = expr:sub(2)
    return getFieldResolver(field)
  end

  if type(expr) == 'table' then
    if (isArray(expr)) then
      return parseArray()
    else
      return parseObject()
    end
  else
    return function()
      return expr
    end
  end

end

--------------- Conditional Operators --------------------------------------------------------------

local function trim(input, chars, left, right)
  assert(isObject(args), 'trim expects an array or object')
  if (input == cjson.null) then return nil end
  assert(isString(input), 'trim: missing input')
  if (#input == 0) then return '' end
  if (isNil(chars)) then
    if (left and right) then
      return (input:gsub("^%s*(.-)%s*$", "%1"))
    elseif left then
      return (input:gsub("^%s*", ""))
    elseif right then
      local n = #input
      while n > 0 and input:find("^%s", n) do n = n - 1 end
      return input:sub(1, n)
    end
    return input
  else
    assert(isString(chars), 'chars should be a string')
    local len = #input
    local codepoints = {}

    for i = 1, #chars do
      local ch = chars:sub(i, i)
      codepoints[ch] = true
    end

    --- debug('chars = ' .. chars .. ', codepoints = ' .. tostr(codepoints))
    local i = 1
    local j = len
    local s = input

    while (left and i < j and codepoints[s:sub(i,i)]) do
      i = i + 1
    end
    while (right and j > i and codepoints[s:sub(j,j)]) do
      j = j - 1
    end

    return s:sub(i, j)
  end
end


local function prepJsonField(job, name)
  if referencedFields[name] then
    local saved = job[name]
    local success, res = pcall(cjson.decode, saved)
    if (success) then
      job[name] = res
    else
      -- todo: throw
    end
    return saved
  end
end

local function getIdPart(key, prefix)
  local sub = key:sub(#prefix + 1)
  if sub:find(':') == nil and not ADMIN_KEYS[sub] then
    return sub
  end
  return nil
end

local function prepareJobHash(id, jobHash)
  local job = to_hash(jobHash)
  job['id'] = id
  prepJsonField(job, 'data')
  return job
end

local function search(key, keyPrefix, criteria, cursor, count)
  count = count or 20
  local scanResult = {}
  local predicate = compileQuery(criteria)
  local match = keyPrefix .. '*'
  local fullScan = false

  local keyType = ''

  if (key ~= nil and #key > 0) then
    redis.call("TYPE", key)
    keyType = keyType["ok"]
  end

  if (keyType == 'zset') then
    scanResult = redis.call('zscan', key, cursor, "COUNT", count, 'MATCH', match)
  elseif keyType == 'set' then
    scanResult = redis.call('sscan', key, cursor, "COUNT", count, 'MATCH', match)
  else
    fullScan = true
    scanResult = redis.call('scan', cursor, "COUNT", count, 'MATCH', match)
  end

  local newCursor = scanResult[1]
  local scannedJobIds = scanResult[2]

  if (fullScan) then
    -- does a keyspace as opposed to list scan. Filter out non-ids
    local filteredIds = {}
    local i = 0
    for _, key in ipairs(scannedJobIds) do
      local id = getIdPart(key, keyPrefix)
      if (id ~= nil) then
        i = i + 1
        filteredIds[i] = id
      end
      scannedJobIds = filteredIds
    end
  elseif (keyType == 'zset') then
    -- strip out score
    scannedJobIds = map(scannedJobIds, function(val)
      return val[1]
    end)
  end

  local result = { newCursor }

  for _, jobId in pairs(scannedJobIds) do

    local jobIdKey = keyPrefix .. jobId
    local jobHash = redis.pcall('HGETALL', jobIdKey)

    if (isObject(jobHash) and #jobHash) then
      local job = prepareJobHash(jobId, jobHash)
      if (predicate(job)) then
        table.insert(result, "jobId")
        table.insert(result, jobId)

        for _, value in pairs(jobHash) do
          table.insert(result, value)
        end
      end
    end
  end

  return result
end

local key = KEYS[1]
local prefix = assert(ARGV[1], 'Key prefix not specified')
local criteria = assert(cjson.decode(ARGV[2]), 'Invalid filter criteria. Expected a JSON encoded string')
local cursor = ARGV[3]
local count = ARGV[4] or 10

return search(key, prefix, criteria, cursor, count)

-- TODO: validate expression
