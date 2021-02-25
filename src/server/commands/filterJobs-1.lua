--[[
  Get Jobs by filter criteria
     Input:
        KEYS[1] Queue / Name Set Key
        ARGV[1] Key Prefix
        ARGV[2] filter criteria as a json encoded string
        ARGV[3] cursor
        ARGV[4] count
]]

local NUMERIC_FIELDS = {
    ['timestamp'] = 1,
    ['processedOn'] = 1,
    ['finishedOn'] = 1,
    ['delay'] = 1,
}

local JSON_FIELDS = {
    ['data'] = 1,
    ['opts'] = 1,
    ['returnValue'] = 1,
    ['stackTrace'] = 1
}

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

local POSITIVE_INFINITY = 1e309;

--- UTILITY -----------------------------------------------------------------------------
---

local DecimalRE = "([+-]?%d*%.?%d+)"

local floor = math.floor
local find = string.find

local function isString(val)
    return type(val) == 'string'
end

local function isNil(val)
    return type(val) == 'nil' or val == cjson.null
end

local function isNumber(val)
    return type(val) == 'number'
end

local function isBoolean(val)
    return type(val) == 'boolean'
end

local function isFunction(val)
    return type(val) == 'function'
end

local function inArray(arr, value)
    for _, v in ipairs(arr) do
        if v == value then
            return true
        end
    end
    return false
end

local function isObject(val)
    return type(val) == 'table'
end

local function isArray(t)
    if (type(t) ~= 'table') then
        return false
    end
    local i = 0
    for k, v in pairs(t) do
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
    local isNil = isNil
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

--- Type Conversion
local function toNum(value, ...)
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
        num = toNum(value(...))
    end
    return num
end

local function toBool(value, ...)
    local bool = false
    local t = type(value)
    if (t == 'string') then
        if (value == 'true') then
            return true
        end
        if (value == 'false') then
            return false
        end
        return #value > 0
    elseif t == 'boolean' then
        bool = value
    elseif (t == 'number') then
        bool = value ~= 0
    elseif t == 'function' then
        bool = bool(value(...))
    end
    return bool
end

local dblQuote = function(v)
    return '"' .. v .. '"'
end

local function toStr(value, ...)
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
        --- return toStr(value(...))
        return 'function()'
    elseif (t == 'table') then
        local delims = { '{', '}' }
        if isArray(value) then
            delims = { '[', ']' }
        end
        str = delims[1]
        for k, v in pairs(value) do
            local s = isString(v) and dblQuote(v) or toStr(v, ...)
            if isNumber(k) then
                str = str .. s .. ', '
            else
                str = str .. dblQuote(k) .. ': ' .. s .. ', '
            end
        end
        str = str:sub(0, #str - 2) .. delims[2]
    end
    return str
end

local function toDouble(val)
    if (isNil(val)) then
        return nil
    end
    if (isNumber(val)) then
        return val
    end
    if (isBoolean(val)) then
        return val and 1 or 0
    end
    if (isString(val)) then
        local res = tonumber(val)
        if isNumber(res) then
            return res
        end
    end
    assert(false, 'cannot cast "' .. toStr(val) .. '" to double')
    return nil
end

local function toInt(val)
    return trunc(toDouble(val))
end

--- https://stackoverflow.com/questions/37753694/lua-check-if-a-number-value-is-nan
local function isNaN(number)
    return isNumber(number) and number ~= number
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

local function instanceof(a, b)
    local t = b
    --- todo: make sure b in ['string', 'number', 'null', 'object', 'array', 'boolean']
    if (t == JsType.NUMBER) then
        return isNumber(a)
    elseif (t == JsType.OBJECT) then
        return isObject(a) and not isArray(a)
    elseif (t == JsType.STRING) then
        return isString(a)
    elseif (t == JsType.ARRAY) then
        return isArray(a)
    elseif (t == JsType.NULL or t == 'null') then
        return isNil(a)
    elseif (t == JsType.BOOLEAN) then
        return isBoolean(a)
    end
    return false
end

local function debug(msg)
    redis.call('rpush', 'filterJobs-debug', toStr(msg))
end

--- String Functions ------------------------------------------
---
local function substr(s, start, count)
    if (isNil(s)) then
        return nil
    end
    assert(isString(s), '$substr: expected string as first argument')
    if (start < 0) then
        return ''
    end
    -- lua indexes start at 1
    if (start >= 0) then
        start = start + 1
    end
    count = assert(tonumber(count or #s), 'count should be a number')
    if (count < 0) then
        return s:sub(start, #s)
    end
    return s:sub(start, start + count - 1)
end

local function substring(s, startIndex, endIndex)
    if (isNil(s)) then
        return nil
    end

    assert(isString(s), 'substring(): expected string as first argument')
    if (endIndex == nil or endIndex == cjson.null) then
        endIndex = string.len(s)
    end
    endIndex = assert(tonumber(endIndex), 'substring(): expected number for endIndex')
    if (startIndex < 0) then
        return ''
    end
    -- lua indexes start at 1
    if (startIndex >= 0) then
        startIndex = startIndex + 1
    end
    return s:sub(startIndex, endIndex)
end

local function stringSlice(s, startIndex, endIndex)
    if (isNil(s)) then
        return nil
    end

    assert(isString(s), 'slice(): expected string as first argument')
    local length = string.len(s)
    if (endIndex == nil or endIndex == cjson.null) then
        endIndex = string.len(s)
    end
    endIndex = assert(tonumber(endIndex), 'slice(): expected number for endIndex')
    if (endIndex > length) then
        endIndex = length
    end
    if (endIndex < 0) then
        endIndex = length + endIndex
    end
    if (startIndex < 0) then
        startIndex = length + startIndex
    end
    if (startIndex > length) then
        return ''
    end
    -- lua indexes start at 1
    return s:sub(startIndex + 1, endIndex + 1)
end

local function toLower(value)
    if (isNil(value)) then
        return nil
    end
    assert(isString(value), 'toLower: string expected')
    return #value > 0 and string.lower(value) or ''
end

local function toUpper(value)
    if (isNil(value)) then
        return nil
    end
    assert(isString(value), 'toUpper: string expected')
    return #value > 0 and string.upper(value) or ''
end

local function contains(haystack, needle, start)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local plen = #needle
    start = (start or 1) + 1
    if  (#haystack >= plen) and haystack:find(needle, start, true) then
        return true
    else
        return false
    end
end

local function startsWith(haystack, needle, start)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local plen = #needle
    start = (start or 1) + 1
    return (#haystack >= plen) and (haystack:sub(start, plen) == needle)
end

local function endsWith(haystack, needle)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local slen = #needle
    return slen == 0 or ((#haystack >= slen) and (haystack:sub(-slen, -1) == needle))
end

local function charAt(str, idx)
    -- assert(isArray(arr), 'First operand to $arrayElemAt must resolve to an array');
    idx = assert(tonumber(idx), 'string index must be an integer')
    -- translate from 0 to 1 bases
    if idx > 0 then
        idx = idx + 1
    end
    local len = #str
    if (idx < 0 and math.abs(idx) <= len) then
        idx = idx + len
        return str:sub(idx, idx)
    elseif (idx >= 0 and idx < len) then
        return str:sub(idx, idx)
    end
    return nil
end

local function indexOfString(haystack, needle, start, ending)
    if (isNil(haystack)) then
        return nil
    end
    assert(isString(haystack), 'indexOf: expected a string as the first argument')
    assert(isString(needle), 'indexOf: expected a string as the second argument')
    start = tonumber(start or 0, "indexOf: start index should be a number")
    assert(start >= 0, "indexOf: start index should be a positive number")

    local len = string.len(haystack)
    if (len == 0) then
        return nil
    end

    local _end = len - 1
    if ending ~= nil then
        _end = tonumber(ending, "indexOf: end index should be a number")
        assert(_end >= 0, "indexOf: end index should be a positive number")
    end
    --- convert from 0 to 1 based indices
    start = start + 1
    _end = _end + 1

    local part = string.sub(haystack, start, _end)
    local index = string.find(part, needle, 1, true)
    if (index ~= nil) then
        return (index[1] + start - 1)
    end
    return index
end

local function lastIndexOfString(haystack, needle, fromIndex)
    local length = string.len(haystack)
    if (fromIndex == nil) then
        fromIndex = length
    end
    if (fromIndex < 0) then fromIndex = 0 end
    if (fromIndex > length) then fromIndex = length end
    local i, j
    local k = fromIndex
    repeat
        i = j
        j, k = find(haystack, needle, k + 1, true)
    until j == nil

    return i
end

local function trimInternal(name, input, chars, left, right)
    if (input == cjson.null) then
        return nil
    end
    assert(isString(input), name .. ': missing input')
    if (#input == 0) then
        return ''
    end
    if (isNil(chars)) then
        if (left and right) then
            return (input:gsub("^%s*(.-)%s*$", "%1"))
        elseif left then
            return (input:gsub("^%s*", ""))
        elseif right then
            local n = #input
            while n > 0 and input:find("^%s", n) do
                n = n - 1
            end
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

        --- debug('chars = ' .. chars .. ', codepoints = ' .. toStr(codepoints))
        local i = 1
        local j = len
        local s = input

        while (left and i < j and codepoints[s:sub(i, i)]) do
            i = i + 1
        end
        while (right and j > i and codepoints[s:sub(j, j)]) do
            j = j - 1
        end

        return s:sub(i, j)
    end
end

local function trim(input, chars)
    return trimInternal('trim', input, chars,true, true)
end

local function ltrim(input, chars)
    return trimInternal('ltrim', input, chars,true, false)
end

local function rtrim(input, chars)
    return trimInternal('rtrim', input, chars, false, true)
end

local function splitString(s, delimiter)
    local result = {}
    if (isNil(s)) then
        return nil
    end
    assert(isString(delimiter), 'split requires a string delimiter');
    for match in (s .. delimiter):gmatch("(.-)" .. delimiter) do
        table.insert(result, match);
    end
    return result
end

local function split (str, sep)
    local sep, fields = sep or ".", {}
    local pattern = string.format("([^%s]+)", sep)
    str:gsub(pattern, function(c)
        fields[#fields + 1] = c
    end)
    return fields
end

local function stringReplace(s)

end

local function stringConcat(str, ...)
    local args = { ... }
    assert(isString(str), 'String.concat: string required');
    for _, v in ipairs(args) do
        str = str .. toStr(v)
    end
    return str
end

local function strcasecmp(a, b)
    assert(isString(a) and isString(b), 'Invalid parameters to strcasecmp')

    a = a:upper()
    b = b:upper()

    if (a > b) then
        return 1
    end
    if (a < b) then
        return -1
    end
    return 0
end

local function stringMatches(a, pattern)
    assert(isString(pattern), 'matches: pattern should be a string')
    local arr = ensureArray(a)

    local function isMatch(x)
        return (isString(x)) and x:match(pattern)
    end

    return some(arr, function(x)
        local t = type(x)
        if (isMatch(x)) then return true end
        if (t == 'table') then
            for _, str in ipairs(x) do
                if isMatch(str) then
                    return true
                end
            end
        end
        return false
    end)
end

--- Array Functions ---------------------------------------

local function ensureArray(x)
    return isArray(x) and x or { x }
end

local function some(arr, fn)
    for _, val in ipairs(arr) do
        if (fn(val)) then
            return true
        end
    end
    return false
end

-- intersect arrays (not hashes)
local function intersection(first, second)
    local t = {}
    local len = 0
    local dedup = {}
    for _, v in ipairs(first) do
        if (not dedup[v]) and inArray(second, v) then
            len = len + 1
            t[len] = v
            dedup[v] = true
        end
    end
    return t
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

-- raw value should be a kv table [name, value, name, value ...]
-- convert to an associative array
local function to_hash(value)
    local len, result = #value, {}
    for k = 1, len, 2 do
        result[value[k]] = value[k + 1]
    end
    return result
end

--- todo: full copy on each op to ensure immutability
local function arrayPush(arr, value)
    if (value == nil) then
        value = cjson.null
    end
    table.insert(arr, value)
    return arr
end

local function arrayPop(arr)
    return table.remove(arr, #arr)
end

local function arrayShift(arr, value)
    return table.remove(arr, 1);
end

local function arrayUnshift(arr, value)
    table.insert(arr, 1, value);
    return arr
end

local function arrayReverse(arr)
    local reversed = {}
    local itemCount = #arr
    for k, v in ipairs(arr) do
        reversed[itemCount + 1 - k] = v
    end
    return reversed
end

local function arrayConcat(arr, value)
    local type = getType(value)
    if (JS_SIMPLE_TYPES[type]) then
        table.insert(arr, value)
    end
    assert(type == 'array', 'Array expected in array.concat()');
    local i = #arr
    for _, v in ipairs(value) do
        i = i + 1
        arr[i] = v
    end
    return arr
end

local function arrayJoin(arr, glue)
    local res = ''
    local len = #arr
    glue = tostring(glue)
    for _, v in ipairs(arr) do
        res = res .. tostring(v)
        if _ < len then
            res = res .. glue
        end
    end
    return res
end

local function arrayElement(arr, idx)
    -- assert(isArray(arr), 'First operand to $arrayElemAt must resolve to an array');
    idx = assert(tonumber(idx), 'number expected for array index')
    -- translate from 0 to 1 bases
    if idx >= 0 then
        idx = idx + 1
    end
    debug('arrayElement. Idx = ' .. toStr(idx))
    local len = #arr
    if (idx < 0 and math.abs(idx) <= len) then
        return arr[idx + len]
    elseif (idx >= 1 and idx <= len) then
        return arr[idx]
    end
    return nil
end

local function arrayIndexOf(haystack, needle, start)
    if (isNil(haystack)) then
        return nil
    end
    assert(isString(haystack), 'indexOf: expected a string as the first argument')
    start = tonumber(start or 0, "indexOf: start index should be a number")

    local len = string.len(haystack)
    if (start < 0) then
        start = len + start
    end

    if (len == 0 or start >= len) then
        return -1
    end
    --- convert from 0 to 1 based indices
    start = start + 1

    for i = start, len do
        if (isEqual( haystack[i], needle )) then
            return i - 1
        end
    end
    return -1
end

local function arrayIncludes(haystack, needle)
    return arrayIndexOf(haystack, needle, 0) >= 0
end

local function arraySlice(arr, startIndex, endIndex)
    assert(isArray(arr), 'slice(): expected string as first argument')
    local length = #arr
    local res = {}
    if (endIndex == nil or endIndex == cjson.null) then
        endIndex = length
    end
    assert(isNumber(endIndex), 'slice(): expected number for endIndex')
    if (endIndex > length) then
        endIndex = length
    end
    if (endIndex < 0) then
        endIndex = length + endIndex
    end
    if (startIndex < 0) then
        startIndex = length + startIndex
    end
    if (startIndex > length) then
        return ''
    end
    -- lua indexes start at 1
    local len = 0
    for i = startIndex + 1, endIndex + 1 do
        len = len + 1
        res[len] = arr[i]
    end
    return res
end

local function arrayAll(a, b)
    if (isArray(a) and isArray(b)) then
        -- order of arguments matter
        local int = intersection(b, a)
        return #b == #int
    end
    return false
end

local function extrema(name, items, comparator)
    local t = getType(items)
    if (t == "number") then
        -- take a short cut if expr is number literal
        return items
    end
    if (t == "nil") then
        return nil
    end
    assert(t == "array", name .. ' expects an array of numbers')
    local res = cjson.null
    for _, n in ipairs(items) do
        if (isNumber(n)) then
            if (res == cjson.null) then
                res = n
            elseif (comparator(n, res)) then
                res = n
            end
        end
    end
    return res
end

local function arrayMax(expr)
    return extrema('max', expr, function(x, y) return x > y end)
end

local function arrayMin(expr)
    return extrema('min', expr, function(x, y) return x < y end)
end

local function sumValues(name, args)
    assert(isArray(args), name .. ' expects an array')
    local total = 0
    for _, val in ipairs(args) do
        if isNumber(val) then
            total = total + val
        end
    end
    return total
end

local function arrayAvg(args)
    assert(isArray(args), 'avg expects an array');
    local total = sumValues('avg', args)
    if total == 0 then
        return 0
    end
    return total / #args
end
--- Object Functions ----------------------------------------

local function objectKeys(obj)
    local res = {}
    local i = 1
    for k, _ in pairs(obj) do
        res[i] = k
        i = i + 1
    end
end

local function objectValues(obj)
    local res = {}
    local i = 1
    for _, v in pairs(obj) do
        res[i] = v
        i = i + 1
    end
end

local function objectEntries(obj)
    local res = {}
    local i = 1
    for k, v in pairs(obj) do
        res[i] = {k, v}
        i = i + 1
    end
end
--- Number Functions ---------------------------------------

local function xor(a, b)
    local atype = type(a)
    assert(atype == 'boolean' or atype == "number", 'Unexpected operand type "' .. atype ..' in xor"')
    if (atype == 'boolean') then
        return a ~= b
    elseif (atype == 'number') then
        return bitop.bxor(a, toInt(b))
    end
end

-- returns the modulo n % d;
local function mod(n,d) return n - d * math.floor(n/d) end

local function _trunc(val)
    local x, _ = math.modf(val)
    return x
end

--
-- Truncates integer value to number of places. If roundOff is specified round value
-- instead to the number of places
-- @param {Number} num
-- @param {Number} places
-- @param {Boolean} roundOff
--
local function truncate(num, places, roundOff)
    local sign = math.abs(num) == num and 1 or -1
    num = math.abs(num)

    local result = _trunc(num)
    local decimals = num - result

    if (places == 0) then
        local firstDigit = _trunc(10 * decimals)
        if (roundOff and ((result % 2) ~= 0) and firstDigit >= 5) then
            result = result + 1
        end
    elseif (places > 0) then
        local offset = math.pow(10, places)
        local remainder = _trunc(decimals * offset)

        -- last digit before cut off
        local lastDigit = _trunc(decimals * offset * 10) % 10

        -- add one if last digit is greater than 5
        if (roundOff and lastDigit > 5) then
            remainder = remainder + 1
        end

        -- compute decimal remainder and add to whole number
        result = result + (remainder / offset)
    elseif (places < 0) then
        -- handle negative decimal places
        local offset = math.pow(10, -1 * places)
        local excess = result % offset
        result = math.max(0, result - excess)

        -- for negative values the absolute must increase so we round up the last digit if >= 5
        if (roundOff and sign == -1) then
            while (excess > 10) do
                excess = excess - (excess % 10)
            end
            if (result > 0 and excess >= 5) then
                result = result + offset
            end
        end
    end

    return result * sign
end

local function round(num, place)
    if (isNil(num) or isNaN(num) or math.abs(num) == POSITIVE_INFINITY) then
        return num
    end
    assert(isNumber(num), 'round: number expected.')

    return truncate(num, place, true)
end

local function trunc(num, places)
    if (isNil(num) or isNaN(num) or math.abs(num) == POSITIVE_INFINITY) then
        return num
    end
    num = assert(tonumber(num), 'trunc: number expected.')
    assert(isNil(places) or (isNumber(places) and places > -20 and places < 100),
            "trunc: invalid number of places")
    return truncate(num, places, false)
end

---- Date --------------------------------------------------
--- https://stackoverflow.com/questions/95492/how-do-i-convert-a-date-time-to-epoch-time-unix-time-seconds-since-1970-in-per
--- https://github.com/Tieske/date/blob/master/src/date.lua
local DATE_EPOCH = 0 -- we're matching javascript

local HOURS_PER_DAY = 24
local MINS_PER_HOUR = 60
local MINPERDAY    = 1440  -- 24*60
local SECS_PER_MIN = 60
local SECS_PER_HOUR  = 3600  -- 60*60
local SECS_PER_DAY   = 86400 -- 24*60*60
local TICKS_PER_SEC = 1000
local TICKS_PER_HOUR = 3600000
local TICKS_PER_DAY = 86400000
local TICKS_PER_WEEK = TICKS_PER_DAY * 7
local TICKS_PER_YEAR = TICKS_PER_DAY * 365.25
local TICKS_PER_MIN = 60000
local DAYNUM_MAX =  365242500 -- Sat Jan 01 1000000 00:00:00
local DAYNUM_MIN = -365242500 -- Mon Jan 01 1000000 BCE 00:00:00
local DAYNUM_DEF =  0 -- Mon Jan 01 1970 00:00:00

local UNIT_TO_MILLIS = {
    ["milliseconds"] = 1,
    ["millisecond"] = 1,
    ["msecs"] = 1,
    ["msec"] = 1,
    ["ms"] = 1,
    ["seconds"] = TICKS_PER_SEC,
    ["second"] = TICKS_PER_SEC,
    ["secs"] = TICKS_PER_SEC,
    ["sec"] = TICKS_PER_SEC,
    ["s"] = TICKS_PER_SEC,
    ["minutes"] = TICKS_PER_MIN,
    ["minute"] = TICKS_PER_MIN,
    ["mins"] = TICKS_PER_MIN,
    ["min"] = TICKS_PER_MIN,
    ["m"] = TICKS_PER_MIN,
    ["hours"] = TICKS_PER_HOUR,
    ["hour"] = TICKS_PER_HOUR,
    ["hr"] = TICKS_PER_HOUR,
    ["h"] = TICKS_PER_HOUR,
    ["days"] = TICKS_PER_DAY,
    ["day"] = TICKS_PER_DAY,
    ["d"] = TICKS_PER_DAY,
    ["weeks"] = TICKS_PER_WEEK,
    ["week"] = TICKS_PER_WEEK,
    ["w"] = TICKS_PER_WEEK,
    ["years"] = TICKS_PER_YEAR,
    ["year"] = TICKS_PER_YEAR,
    ["yr"] = TICKS_PER_YEAR,
    ["y"] = TICKS_PER_YEAR,
}

--- try to mimic ms on npm
--- https://github.com/vercel/ms/blob/master/index.js
local MS_PATTERN = '([+-]?%d*%.?%d+)%s*(%a+)'
local function ms(str)

end

local MONTH_OFFSETS = { 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 }

-- is year y leap year?
local function isleapyear(y) -- y must be int!
    return (mod(y, 4) == 0 and (mod(y, 100) ~= 0 or mod(y, 400) == 0))
end

-- day since year 0
local function dayFromYear(y) -- y must be int!
    y = y - 1970
    return 365*y + floor(y/4) - floor(y/100) + floor(y/400)
end

-- day number from date, month is zero base
local function makeDayNumber(y, m, d)
    local mm = mod(mod(m,12) + 10, 12)
    return dayFromYear(y + floor(m/12) - floor(mm/10)) + floor((mm*306 + 5)/10) + d - 307
    --local yy = y + floor(m/12) - floor(mm/10)
    --return dayfromyear(yy) + floor((mm*306 + 5)/10) + (d - 1)
end

-- date from day number, month is zero base
local function breakDayNumber(g)
    local g = g + 306
    local y = floor((10000*g + 14780)/3652425)
    local d = g - dayFromYear(y)
    if d < 0 then y = y - 1; d = g - dayFromYear(y) end
    local mi = floor((100*d + 52)/3060)
    return (floor((mi + 2)/12) + y), mod(mi + 2,12), (d - floor((mi*306 + 5)/10) + 1)
end

-- day fraction from time
local function makeDayFractional(hour, min, sec, millis)
    return ((hour * 60 + min) * 60 + sec) * TICKS_PER_SEC + millis
end

-- time from day fraction
local function breakDayFractional(df)
    return
    mod(floor(df/ TICKS_PER_HOUR), HOURS_PER_DAY),
    mod(floor(df/ TICKS_PER_MIN), MINS_PER_HOUR),
    mod(floor(df/ TICKS_PER_SEC), SECS_PER_MIN),
    mod(df, TICKS_PER_SEC)
end

-- weekday sunday = 0, monday = 1 ...
local function weekday(dn) return mod(dn + 1, 7) end

-- Get epoch millis
local function getEpochDate(year, month, day, hour, min, sec, ms)
    ms = ms or 0
    if (year <= 30) then
        year = 2000 + year
    elseif (year < 100) then
        year = 1900 + year
    end
    local whole = (makeDayNumber(year, month - 1, day) - DATE_EPOCH) * TICKS_PER_DAY
    local fractional = makeDayFractional(hour, min, sec, ms)
    return whole + fractional
end

local DATETIME_REGEX = "(%d+)%-(%d+)%-(%d+)%a(%d+)%:(%d+)%:([%d%.]+)([Z%+%- ])(%d?%d?)%:?(%d?%d?)"

local function parseJsonDate(json_date)
    if (isNil(json_date)) then return nil end
    local year, month, day, hour, minute, xSeconds, offsetSign, offsetHour, offsetMin = json_date:match(DATETIME_REGEX)
    year = tonumber(year)
    month = tonumber(month)
    day = tonumber(day)
    hour = tonumber(hour)
    minute = tonumber(minute)
    local seconds, millis = split(xSeconds)
    seconds = tonumber(seconds)
    millis = tonumber(seconds or 0)
    local timestamp = getEpochDate(year, month, day, hour, minute, seconds, millis)
    local offset = 0
    if offsetSign ~= 'Z' then
        offset = tonumber(offsetHour) * 60 + tonumber(offsetMin)
        if offsetSign == "-" then offset = -offset end
    end
    local value = (timestamp - (offset * 1000))
    return value
end

local function toDate(value, ...)
    local num = nil
    local t = type(value)
    if t == 'string' then
        local ok = pcall(function()
            num = parseJsonDate(value)
        end)
        if not ok then
            num = nil
        end
    elseif (t == 'number') then
        num = trunc(value)
    elseif (t == 'function') then
        num = toNum(value(...))
    end
    assert(isNumber(num), 'Invalid date value: "' .. tostring(value) ..'"')
end


local function dateFromParts(year, month, day, hour, minute, second, millisecond)
    local _args = args

    local function parse(name, index, defaultValue)
        local val = _args[index]
        if (val == nil) then
            if (defaultValue == nil) then
                assert(false, '$dateFromParts: expected value for ' .. name)
            end
            return defaultValue
        end
        return val
    end

    local function getParam(name, val, min, max)
        val = assert(tonumber(val), 'Number expected for ' .. name .. ' parameter ')
        assert(val >= min and val <= max, name .. ' should be between ' .. toStr(min) .. ' and ' .. toStr(max))
        return val
    end

    year = parse('year', 1)
    month = parse('month', 1)
    day = parse('day', 1)
    hour = parse('hour', 0)
    minute = parse('minute', 0)
    second = parse('day', 0)
    millisecond = parse('millisecond', 0)

    year = getParam('year', year, 1, 6000)
    month = getParam('month', month, 1, 12)
    day = getParam('day', day, 1, 31)
    hour = getParam('hour', hour, 0, 23)
    minute = getParam('minute', minute, 0, 59)
    second = getParam('second', second, 0, 59)
    local ms = getParam('millisecond', millisecond, 0, 59)
    return getEpochDate(year, month, day, hour, minute, second, ms)
end

local function createDatePartFunction(index)
    return function(value)
        local date = toDate(value)
        --- https://github.com/Tieske/date/blob/cd8f6d40e9f232564da4191c8c10f49e70a5aa61/src/date.lua#L415
        local dayNumber = floor(date/ TICKS_PER_DAY)
        local arr = breakDayNumber(dayNumber)
        return arr[index]
    end
end

local function createTimePartFunction(fracDivisor, modDivisor)
    return function(date)
        local date = toDate(date)
        --- https://github.com/Tieske/date/blob/cd8f6d40e9f232564da4191c8c10f49e70a5aa61/src/date.lua#L415
        local fraction = mod(date, TICKS_PER_DAY)
        return mod(floor(fraction/fracDivisor), modDivisor)
    end
end

local getYear = createDatePartFunction(1)
local getMonth = createDatePartFunction(2)
local getDayOfMonth = createDatePartFunction(3)

local getHour = createTimePartFunction(TICKS_PER_HOUR, HOURS_PER_DAY)
local getMinutes = createTimePartFunction(TICKS_PER_MIN, MINS_PER_HOUR)
local getSeconds = createTimePartFunction(TICKS_PER_SEC, SECS_PER_MIN)

local function getDayOfWeek(val)
    local date = toDate(val)
    local dayNumber = floor(date/ TICKS_PER_DAY)
    return weekday(dayNumber)
end

-------------------------------------------------------------------------------------------
local TypeProps = {
    ["string"] = {
        ['length'] = function(value) return #value end
    },
    ["array"] = {
        ['length'] = function(value) return #value end
    }
}

local function getPropValue(object, propertyName, objectType)
    local propTable = TypeProps[objectType] or {}
    local fn = propTable[propertyName]
    return fn and fn(object) or nil
end

local function resolveStringMember(value, prop)

end
--
-- Resolve the value of the field (dot separated) on the given object
-- @param obj {Object} the object context
-- @param selector {String} dot separated path to field
-- @param {ResolveOptions} options
-- @returns {*}
--
local function resolve(obj, selector, unwrapArray)
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
        local getPropValue = getPropValue
        local isArray = isArray
        local valueOrFn
        -- debug('resolving path ' .. toStr(path) .. ' in object ' .. toStr(o))

        while (index <= #path) do
            local field = path[index]
            local t = type(value)
            if (t == 'table') then
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

                valueOrFn = value[field]
                if (type(valueOrFn) == 'function') then
                    value = valueOrFn(value)
                else
                    value = valueOrFn
                end
            elseif t == 'function' then
                value = value(o)
            else
                value = getPropValue(value, field, t)
            end

            -- debug(field .. ':' .. toStr(value) .. ', ' .. toStr(index) .. '/' .. toStr(#path))

            index = index + 1
            if isNil(value) then
                break
            end
        end
        return value
    end

    local t = type(obj)
    if (t == 'table') then
        if (type(selector) == 'string') then
            selector = split(selector,'.')
        end
        obj = resolve2(obj, selector, 1)
        if (unwrapArray) then
            obj = unwrap(obj, depth)
        end
    end

    return obj
end


---- OPERATORS ------------------------------------------------------------------------

local function createCompareFn(fn)
    return function(a, b)
        local fn = fn
        local getType = getType
        local atype = getType(a)
        local btype = getType(b)
        if (atype == 'nil' or btype == 'nil') then
            return nil
        end
        return (btype == atype) and fn(a, b)
    end
end

local function createMathBinOp(fn)
    return function(a, b)
        local left = tonumber(a)
        local right = tonumber(b)
        if (left == nil or right == nil) then
            return nil
        end
        return fn(left, right);
    end
end

local function handleAdd(a, b)
    local atype = getType(a)
    local btype = getType(b)

    if atype == 'nil' or btype == 'nil' then
        return nil
    end
    if (atype == 'number') then
        if (btype == 'number') then
            return a + b
        end
    elseif (atype == 'string') then
        return a .. toStr(b)
    end
    assert(false, 'invalid operand type for +')
end

local function handleIn(a, b)
    -- assert(isArray(b), '')
    -- queries for null should be able to find undefined fields
    if (isNil(a)) then
        return some(b, isNil)
    end
    a = ensureArray(a)
    for _, v in ipairs(a) do
        if not inArray(b, v) then
            return false
        end
    end
    return true
end

local UnaryOps = {
    ['!'] = function(value) return not toBool(value) end,
    ['!!'] = function(value) return toBool(value) end,
    ['-'] = function(value) return -1 * toDouble(value) end,
    ['+'] = toNum,
    ['typeof'] = getType
}

local BinaryOps = {
    ['&&'] = function(left, right) return toBool(left) and toBool(right) end,
    ['||'] = function(a, b) return toBool(a) or toBool(b) end,
    ['^'] = xor,
    ['=='] = isEqual,
    ['!='] = function(a, b) return a ~= b end,
    ['<>'] = function(a, b) return a ~= b end,
    ['<'] = createCompareFn(function(x, y) return x < y end),
    ['<='] = createCompareFn(function(x, y) return x <= y end),
    ['>'] = createCompareFn(function(x, y) return x > y end),
    ['>='] = createCompareFn(function(x, y) return x >= y end),
    ['+'] = handleAdd,
    ['-'] = createMathBinOp(function(a, b) return a - b end),
    ['*'] = createMathBinOp(function(a, b) return a * b end),
    ['%'] = createMathBinOp(function(a, b) return a % b end),
    ['/'] = createMathBinOp(function(a, b)
        assert(b ~= 0, 'divide: dividend must be a non-zero number')
        return a / b;
    end),
    ["matches"] = stringMatches,
    ['in'] = handleIn,
    ['instanceof'] = instanceof
}

--- EXPRESSION FUNCTIONS -------------------------------------------------------------

local function createSingleParamMathFn(name, fn)
    return function(val)
        local name = name
        local t = type(val)
        if (t == 'number') then
            return fn(val)
        end
        if (isNil(val)) then
            return nil
        end
        assert(isNumber(val), name .. ': argument must resolve to a number.')
        return fn(val)
    end
end

local MathOps = {
    ['PI'] = math.pi,
    ['abs'] = createSingleParamMathFn('abs', math.abs),
    ['acos'] = createSingleParamMathFn('acos', math.acos),
    ['atan'] = createSingleParamMathFn('atan', math.atan),
    ['ceil'] = createSingleParamMathFn('ceil', math.ceil),
    ['cos'] = createSingleParamMathFn('cos', math.cos),
    ['cosh'] = createSingleParamMathFn('cosh', math.cosh),
    ['floor'] = createSingleParamMathFn('floor', math.floor),
    ['pow'] = createSingleParamMathFn('floor', math.pow),
    ['round'] = createSingleParamMathFn('round', math.round),
    ['sign'] = createSingleParamMathFn('sign', math.sign),
    ['sin'] = createSingleParamMathFn('sin', math.sin),
    ['sinh'] = createSingleParamMathFn('sinh', math.sinh),
    ['sqrt'] = createSingleParamMathFn('sqrt', math.sqrt),
    ['tan'] = createSingleParamMathFn('tan', math.tan),
    ['tanh'] = createSingleParamMathFn('tanh', math.tanh),
    ['trunc'] = createSingleParamMathFn('trunc', math.trunc),
    ['log'] = createSingleParamMathFn('log', math.log),
    ['log10'] = createSingleParamMathFn('log10', math.log10),
    ['min'] = arrayMin,
    ['max'] = arrayMax
}

local DateOps = {
    ["parse"] = parseJsonDate()
}

local ObjectOps = {
    ["keys"] = objectKeys,
    ["values"] = objectValues,
    ["entries"] = objectEntries,
}

local GlobalObjects = {
    ['Math'] = MathOps,
    ['Object'] = ObjectOps,
    ['Date'] = DateOps
}

local StringMethods = {
    ['concat'] = stringConcat,
    ['toLowerCase'] = toLower,
    ['toUpperCase'] = toUpper,
    ['startsWith'] = startsWith,
    ['endsWith'] = endsWith,
    ['includes'] = contains,
    ['indexOf'] = indexOfString,
    ['lastIndexOf'] = lastIndexOfString,
    ['charAt'] = charAt,
    ['trim'] = trim,
    ['trimStart'] = ltrim,
    ['trimEnd'] = rtrim,
    ["toString"] = function(v) return v end,
    ["valueOf"] = function(v) return v end,
    ['strcasecmp'] = strcasecmp,
    ["substr"] = substr,
    ["substring"] = substring,
    ["split"] = splitString,
    ["slice"] = stringSlice
}

local ArrayMethods = {
    ["pop"] = arrayPop,
    ["push"] = arrayPush,
    ["concat"] = arrayConcat,
    ["shift"] = arrayShift,
    ["unshift"] = arrayUnshift,
    ["join"] = arrayJoin,
    ["indexOf"] = arrayIndexOf,
    ["includes"] = arrayIncludes,
    ["includeAll"] = arrayAll,
    ["reverse"] = arrayReverse,
    ["slice"] = arraySlice,
    ['min'] = arrayMin,
    ["max"] = arrayMax,
    ["avg"] = arrayAvg
}

--- todo: toJSON
--- https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON
local DateMethods = {
    ['getYear'] = getYear,
    ['getMonth'] = getMonth,
    ['getDayOfMonth'] = getDayOfMonth,
    ['getDayOfWeek'] = getDayOfWeek,
    ['getHour'] = getHour,
    ['getMinutes'] = getMinutes,
    ['getSeconds'] = getSeconds,
}

local ObjectMethods = {
    ["getOwnPropertyNames"] = objectKeys,
    ["toString"] = toStr,
}

local ObjectTypeMethods = {
    ["string"] = StringMethods,
    ["array"] = ArrayMethods,
    ["object"] = ObjectMethods,
    ["number"] = DateMethods    -- treat numbers as epoch dates
}

local Functions = {
    ['parseBoolean'] = toBool,
    ['parseDate'] = toDate,
    ['parseFloat'] = toDouble,
    ["parseInt"] = toInt,
    ["toString"] = toStr,
    ["isString"] = isString,
    ["isNumber"] = isNumber,
    ["isArray"] = isArray,
    ["round"] = round,
    ["trunc"] = trunc,
    ['ifNull'] = function(value, alternate)
        return isNil(value) and alternate or value
    end,
    ['getYear'] = getYear,
    ['getMonth'] = getMonth,
    ['getDayOfMonth'] = getDayOfMonth,
    ['getDayOfWeek'] = getDayOfWeek,
    ['getHour'] = getHour,
    ['getMinutes'] = getMinutes,
    ['getSeconds'] = getSeconds,
    ['getDateFromParts'] = dateFromParts,
    ['strcasecmp'] = strcasecmp,
    ['cmp'] = function(a, b)
        if (a < b) then
            return -1
        end
        if (a > b) then
            return 1
        end
        return 0
    end
}

----- Job Definition -----------------------------------------------------
local function Job(key, id)
    -- the new instance
    local jobHash = redis.pcall('HGETALL', key) or {}

    local self = { ['id'] = id }

    local function getJsonFn(name, raw)
       local result = -1
       return function()
            if (result == -1) then
                local ok, res = pcall(cjson.decode, raw)
                result = ok and res or raw
                debug('!!!! name = "' .. name .. '" raw = ' .. toStr(raw) .. ', data = ' .. toStr(result))
            end
            return result
        end
    end

    if (type(jobHash) == 'table') then
        local len = #jobHash
        for k = 1, len, 2 do
            local key = jobHash[k]
            local val = jobHash[k + 1]
            if (JSON_FIELDS[key]) then
                self[key] = getJsonFn(key, val)
            else
                self[key] = val
            end
        end
        self.found = len > 0
    else
        self.found = false
    end

    self._jobHash = jobHash

    function self.latency()
        local processedOn = tonumber(self.processedOn)
        local finishedOn = tonumber(self.finishedOn)
        if (processedOn ~= nil) and (finishedOn ~= nil) then
            return finishedOn - processedOn
        end
        return nil
    end

    function self.waitTime()
        local processedOn = tonumber(self.processedOn)
        local timestamp = tonumber(self.timestamp)
        if (processedOn ~= nil) and (timestamp ~= nil) then
            return timestamp - processedOn
        end
        return nil
    end

    local _progress = -3;
    local _savedProgress = self.progress

    function self.progress()
        return function()
            if (_progress == -3) then
                local num = tonumber(_savedProgress)
                return (num ~= nil) and num or _savedProgress
            end
            return _progress
        end
    end

    -- return the instance
    return self
end


--- Execution ------------------------------------------------------------
---
local stack = {}

local push = function(val)
    if (val == nil) then
        val = cjson.null
    end
    table.insert(stack, val)
end

local function pop()
    return table.remove(stack)
end

local function conditional()
    local elseExpr = assert(pop(), 'ternary: else expression missing')
    local thenExpr = assert(pop(), 'ternary: then expression missing')
    local condition = assert(pop(), 'ternary: missing test condition')
    local value = toBool(condition) and thenExpr or elseExpr
    return value
end

local function functionCall(tok)
    local name = tok.name
    if (name == nil) then
        name = pop()
    end
    local fn = assert(Functions[name], 'Unknown function: "' .. toStr(name) .. '"')
    assert(tok.argc <= #stack, 'Too few on stack for function: "' .. name .. '"')
    local args = {}
    for i = 1, tok.argc do
        args[i] = pop()
    end
    return fn( unpack(args) )
end

local function memberCall(tok)
    local pop = pop
    local value = pop()
    local valueType = getType(value)
    local name = tok.name
    local fn
    if (valueType == 'object') then
        fn = value[name]
    end
    if (fn == nil) then
        local methodTable = ObjectTypeMethods[valueType] or {}
        fn = methodTable[name]
    end
    assert(type(fn) == 'function', 'Unknown method: "' .. name .. '" on type:"' .. valueType .. '"')
    assert(tok.argc <= #stack, 'Too few on stack for function: "' .. name .. '"')
    local args = {}
    for i = 1, tok.argc do
        args[i] = pop()
    end
    local val = fn( unpack(args) )
    return val
end


local fieldHandlers = {}

--- resolve a prop ignoring dotted paths
local function simpleResolve(value, key)
    if (value == cjson.null) then
        return cjson.null
    end
    local valueOrFn = value[key]
    if (type(valueOrFn) == 'function') then
        return valueOrFn(value)
    else
        return valueOrFn
    end
end

local function identifier(token, context)
    local handlers = fieldHandlers
    local name = token.name
    local handler = handlers[name]
    if (handler == nil) then
        local path = split(name, '.') or { name }
        local len = #path
        if (len == 1) then
            handler = function(ctx) return ctx[name] end
        else
            handler = function(obj)
                local value = obj
                local index = 1
                local resolve = simpleResolve
                while (index <= len) and (type(value) == 'table') do
                    value = resolve(value, path[index])
                    index = index + 1
                end
                return value
            end
        end
        handlers[name] = handler
    end
    return handler(context)
end

local function member(token)
    -- if token.name ~= nil its a prop, otherwise the calculated member is on the stack
    if (token.name) then
        return simpleResolve(pop(), token.name)
    end
    local accessor = pop()
    local value = pop()
    local accType = type(accessor)
    local valueType = getType(value)
    if (valueType == 'null') then
        return cjson.null
    end
    debug(' accessor = ' .. toStr(accessor) .. ', valueType = ' .. toStr(valueType) .. ' accessor type = ' .. accType)
    if (accType == 'number') then
        if (valueType == 'string') then
            return charAt(value, accessor)
        elseif (valueType == 'array') then
            return arrayElement(value, accessor)
        end
    elseif (accType == 'string') then
        if (valueType == 'object') then
            return simpleResolve(value, accessor)
        else
            return getPropValue(value, accessor, valueType)
        end
    end
    assert(nil, 'Invalid accessor: "' .. toStr(accessor) .. '"')
end

local function binary(tok)
    local fn = assert(BinaryOps[tok.op], 'Invalid binary operator: "' .. toStr(tok.op) .. '"');
    local left = pop()
    local right = pop()
    return fn(left, right)
end

local function unary(tok)
    local fn = assert(UnaryOps[tok.op], 'Invalid unary operator: "' .. toStr(tok.op) .. '"');
    local arg = pop()
    local val = fn(arg)
    return val
end

local ExecTable = {
    ['binary'] = binary,
    ['unary'] = unary,
    ['identifier'] = identifier,
    ['literal'] = function(tok) return tok.value end,
    ['functionCall'] = functionCall,
    ['member'] = member,
    ['methodCall'] = memberCall,
    ['conditional'] = conditional
}

local function evaluate(tokens, context)
    stack = {}

    local toStr = toStr
    local handlers = ExecTable
    local push = push
    local val, handler

    debug('============================= HERE ==================================')
    for _, tok in ipairs(tokens) do
        handler = assert(handlers[tok.type], 'Invalid token type: "' .. tok.type .. '"')
        val = handler(tok, context)
        push(val)
        debug(toStr(tok) .. ', stack: ' .. toStr(stack))
    end

    local res = pop()
    debug(' res = ' .. toStr(res) .. ', stack:' .. toStr(stack))
    return toBool(res)
end


local function getIdPart(key, prefix)
    local sub = key:sub(#prefix + 1)
    if sub:find(':') == nil and not ADMIN_KEYS[sub] then
        return sub
    end
    return nil
end

local function search(key, keyPrefix, criteria, cursor, count)
    local getIdPart = getIdPart
    local eval = evaluate
    local map = map
    local Job = Job

    count = count or 25
    fieldHandlers = {}
    local scanResult = {}
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
        for _, k in ipairs(scannedJobIds) do
            local id = getIdPart(k, keyPrefix)
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

    local context = {
        ["Math"] = MathOps,
        ["Date"] = DateOps,
        ["Object"] = ObjectOps
    }

    debug(toStr(criteria))

    for _, jobId in pairs(scannedJobIds) do
        local job = Job(keyPrefix .. jobId, jobId)

        if (job.found) then
            context['job'] = job
            if (eval(criteria, context)) then
                table.insert(result, "jobId")
                table.insert(result, jobId)

                local hash = job._jobHash;
                for _, value in pairs(hash) do
                    --- value = referencedFields[k] or value
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
