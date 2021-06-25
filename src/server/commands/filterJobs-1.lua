--[[
  Get Jobs by filter criteria
     Input:
        KEYS[1] Queue / Name Set Key
        ARGV[1] Key Prefix
        ARGV[2] filter criteria as a json encoded string
        ARGV[3] cursor
        ARGV[4] count
]]

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
    ARRAY = 'array',
    DATE = 'date'
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
local NaN = 0/0

local Date = {}
Date.__index = Date


local functionCache = {}

--- UTILITY -----------------------------------------------------------------------------
---

local debug_flag = true
local DecimalRE = "([+-]?%d*%.?%d+)"

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

local function isDate(val)
    return (getmetatable(val) == Date)
end

local function isFunction(val)
    return type(val) == 'function'
end

local function isCallable(callback)
    local tc = type(callback)
    if tc == 'function' then return true end
    if tc == 'table' then
        local mt = getmetatable(callback)
        return type(mt) == 'table' and type(mt.__call) == 'function'
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
    local i = 1
    for _, v in pairs(t) do
        -- note: explicitly check against nil here !!!
        -- for arrays coming from JSON, we can have cjson.null, which we
        -- want to support
        if (type(_) ~= 'number' or t[i] == nil) then
            return false
        end
        i = i + 1
    end
    return true
end

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

--- https://stackoverflow.com/questions/37753694/lua-check-if-a-number-value-is-nan
local function isNaN(number)
    return isNumber(number) and number ~= number
end

local function isINF(value)
    return value == math.huge or value == -math.huge
end

local function isJsFalsy(value)
    if (value == false or value == 0 or value == nil or isNaN(value)) then
        return true
    end
    if (type(value) == 'string') then return #value > 0 end
    return false
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

local function inArray(arr, value)
    local isEqual = isEqual
    for _, v in ipairs(arr) do
        if isEqual(v, value) then
            return true
        end
    end
    return false
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
    elseif (isDate(value)) then
        num = value:getTime()
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
    elseif isDate(value) then
        return value:rfc3339()
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
    local t = type(val)
    if (t == 'nil' or val == cjson.null) then
        return nil
    end
    if (t == 'number') then
        return val
    end
    if (t == 'boolean') then
        return val and 1 or 0
    end
    if (t == 'string') then
        local res = tonumber(val)
        if (res ~= nil) then
            return res
        end
    end
    assert(false, 'cannot cast "' .. toStr(val) .. '" to double')
    return nil
end

local function toInt(val, radix)
    val = tonumber(val, radix or 10)
    if (val == nil) then return NaN end
    local res, _ = math.modf(val)
    -- todo: handle date
    return res
end


local function getType(val)
    if (val == cjson.null) then
        return JsType.NULL
    end
    local t = type(val)
    if (t == 'table') then
        if (isDate(val)) then return JsType.DATE end
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
    elseif (t == JsType.DATE) then
        return isDate(a)
    end
    return false
end

local function isEmpty(value)
    local t = type(value)
    if (t == cjson.null or t == 'nil') then return true end
    if (t == 'string') then return string.len(value) == 0 end
    if (t == 'table') then return #value == 0 end
    return false
end


local function debug(msg)
    if (debug_flag) then
        redis.call('rpush', 'filterJobs-debug', toStr(msg))
    end
end

--- String Functions ------------------------------------------
---
local function substr(s, start, count)
    if (isNil(s)) then
        return nil
    end
    assert(isString(s), 'substr: expected string as first argument')
    local len = #s
    if (start < 0) then
        start = math.max(len + start, 0)
    end
    -- lua indexes start at 1
    if (start >= 0) then
        start = start + 1
        if (start > len) then return '' end
    end
    count = assert(tonumber(count or len), 'count should be a number')
    if (count < 0) then
        return ''
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
    debug('Haystack = ' .. toStr(haystack) .. ' needle = ' .. toStr(needle))
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local plen = #needle
    start = (start or 0) + 1
    if  (#haystack >= plen) and haystack:find(needle, start, true) then
        return true
    else
        return false
    end
end

local function startsWith(haystack, needle, start)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local plen = #needle
    start = (start or 0) + 1
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

local function indexOfString(haystack, needle, start)
    if (isNil(haystack)) then
        return nil
    end
    assert(isString(haystack), 'indexOf: expected a string as the first argument')
    assert(isString(needle), 'indexOf: expected a string as needle')
    start = assert(tonumber(start or 0), "indexOf: start index should be a number")
    --- convert from 0 to 1 based indices

    if (start < 0) then
        start = math.max(0, start + #haystack - 1)
    end
    start = start + 1

    local index, _ = haystack:find(needle, start, true)
    if (index ~= nil) then
        return index - 1
    end
    return -1
end

local function lastIndexOfString(haystack, needle, fromIndex)
    local length = string.len(haystack)
    if (fromIndex == nil) then
        fromIndex = length
    end
    if (fromIndex < 0 or fromIndex > length - 1) then return -1 end
    fromIndex = fromIndex + 1
    local i, j
    local k = fromIndex
    repeat
        i = j
        j, k = haystack:find(needle, k + 1, true)
    until j == nil

    return i - 1
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

local function regexEscape(str)
    return str:gsub("[%(%)%.%%%+%-%*%?%[%^%$%]]", "%%%1")
end
-- you can use return and set your own name if you do require() or dofile()

-- like this: str_replace = require("string-replace")
-- return function (str, this, that) -- modify the line below for the above to work
local function stringReplace(str, this, that)
    return str:gsub(regexEscape(this), that:gsub("%%", "%%%%")) -- only % needs to be escaped for 'that'
end
--- Array Functions ---------------------------------------

-- intersect arrays (not hashes)
local function intersection(first, second)
    local t = {}
    local len = 0
    local dedupe = {}
    for _, v in ipairs(first) do
        if (not dedupe[v]) and inArray(second, v) then
            len = len + 1
            t[len] = v
            dedupe[v] = true
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
    --- debug('arrayElement. Idx = ' .. toStr(idx))
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
    start = assert(tonumber(start or 0), "indexOf: start index should be a number")

    local len = #haystack
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
-- removes the decimal part of a number
local function fix(n) n = tonumber(n) return n and ((n > 0 and math.floor or math.ceil)(n)) end
local function idiv(n, d) return math.floor(n/d) end
local function _trunc(val) local x, _ = math.modf(val) return x end

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

    if (places == nil) then places = 0 end

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

local function sign(v)
    v = tonumber(v)
    if (isNil(v)) then return nil end
    if (v < 0) then return -1 end
    if (v > 0) then return 1 end
    return 0
end

---- Date --------------------------------------------------
--- https://github.com/daurnimator/luatz/blob/master/luatz/timetable.lua
--- https://stackoverflow.com/questions/95492/how-do-i-convert-a-date-time-to-epoch-time-unix-time-seconds-since-1970-in-per
--- https://github.com/Tieske/date/blob/master/src/date.lua

local TICKS_PER_SEC = 1000
local TICKS_PER_HOUR = 3600000
local TICKS_PER_DAY = 86400000
local TICKS_PER_WEEK = TICKS_PER_DAY * 7
local TICKS_PER_YEAR = TICKS_PER_DAY * 365.25
local TICKS_PER_MIN = 60000

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
    local key = 'ms_' .. str
    local result = functionCache[key]
    if (result == nil) then
        result = 0
        for n, unit in str:gmatch(MS_PATTERN) do
            local multiplier = assert(UNIT_TO_MILLIS[unit], 'ms - invalid unit "' .. toStr(unit) .. '"')
            local x = assert(tonumber(n), 'ms - invalid unit multiplier "' .. toStr(n) .. '"');
            result = result + (x * multiplier)
        end
        functionCache[key] = result
    end
    return result
end

local MONTH_LENGTHS = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}
local MONTH_OFFSETS = { 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 }
-- For Sakamoto's Algorithm (day of week)
local SAKAMOTO = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};

-- is year y leap year?
local function isleapyear(y) -- y must be int!
    return (mod(y, 4) == 0 and (mod(y, 100) ~= 0 or mod(y, 400) == 0))
end

local function getMonthLength(m, y)
    if m == 2 then
        return isleapyear(y) and 29 or 28
    else
        return MONTH_LENGTHS[m]
    end
end

local function leap_years_since(year)
    return idiv(year, 4) - idiv(year, 100) + idiv(year, 400)
end

local function getDayOfYear(day, month, year)
    local yday = MONTH_OFFSETS[month]
    if month > 2 and isleapyear(year) then
        yday = yday + 1
    end
    return yday + day
end

local function getDayOfWeek(day, month, year)
    if month < 3 then
        year = year - 1
    end
    return(year + leap_years_since(year) + SAKAMOTO[month] + day) % 7 + 1
end

local function borrow(tens, units, base)
    local frac = tens % 1
    units = units + frac * base
    tens = tens - frac
    return tens, units
end

local function carry(tens, units, base)
    if units >= base then
        tens  = tens + idiv(units, base)
        units = units % base
    elseif units < 0 then
        tens  = tens + idiv(units, base)
        units = (base + units) % base
    end
    return tens, units
end

-- Modify parameters so they all fit within the "normal" range
local function normalize(year, month, day, hour, min, sec, msec)
    local borrow = borrow
    local carry = carry
    local getMonthLength = getMonthLength

    local extraSecs = idiv(msec or 0, 1000)
    msec = msec - (extraSecs * 1000)
    sec = (sec or 0) + extraSecs

    -- `month` and `day` start from 1, need -1 and +1 so it works modulo
    month, day = month - 1, day - 1

    -- Convert everything (except seconds) to an integer
    -- by propagating fractional components down.
    year , month = borrow(year , month, 12)
    -- Carry from month to year first, so we get month length correct in next line around leap years
    year , month = carry(year, month, 12)
    month, day   = borrow(month, day  , getMonthLength(math.floor(month + 1), year))
    day  , hour  = borrow(day  , hour , 24)
    hour , min   = borrow(hour , min  , 60)
    min  , sec   = borrow(min  , sec  , 60)

    -- Propagate out of range values up
    -- e.g. if `min` is 70, `hour` increments by 1 and `min` becomes 10
    -- This has to happen for all columns after borrowing, as lower radixes may be pushed out of range
    min  , sec   = carry(min , sec , 60) -- TODO: consider leap seconds?
    hour , min   = carry(hour, min , 60)
    day  , hour  = carry(day , hour, 24)
    -- Ensure `day` is not underflowed
    -- Add a whole year of days at a time, this is later resolved by adding months
    -- TODO[OPTIMIZE]: This could be slow if `day` is far out of range
    while day < 0 do
        month = month - 1
        if month < 0 then
            year = year - 1
            month = 11
        end
        day = day + getMonthLength(month + 1, year)
    end
    year, month = carry(year, month, 12)

    -- TODO[OPTIMIZE]: This could potentially be slow if `day` is very large
    while true do
        local i = getMonthLength(month + 1, year)
        if day < i then break end
        day = day - i
        month = month + 1
        if month >= 12 then
            month = 0
            year = year + 1
        end
    end

    -- Now we can place `day` and `month` back in their normal ranges
    -- e.g. month as 1-12 instead of 0-11
    month, day = month + 1, day + 1

    return year, month, day, hour, min, sec, msec
end

local function unpackDate(self)
    return assert(self.year , "year required"),
    assert(self.month, "month required"),
    assert(self.day  , "day required"),
    self.hour or 12,
    self.min  or 0,
    self.sec  or 0,
    self.msec or 0
end

local function normalizeDate(self)
    local year, month, day
    year, month, day, self.hour, self.min, self.sec, self.msec = normalize(unpackDate(self))

    self.day   = day
    self.month = month
    self.year  = year
    return self
end

local leap_years_since_1970 = leap_years_since(1970)
-- Get epoch millis
local function getTimestamp(year, month, day, hour, min, sec, msec)
    if (year <= 30) then
        year = 2000 + year
    elseif (year < 100) then
        year = 1900 + year
    end
    year, month, day, hour, min, sec, msec = normalize(year, month, day, hour, min, sec, msec or 0)

    local days_since_epoch = getDayOfYear(day, month, year)
            + 365 * (year - 1970)
            -- Each leap year adds one day
            + (leap_years_since(year - 1) - leap_years_since_1970) - 1

    return days_since_epoch * TICKS_PER_DAY +
            ((hour * 60 + min) * 60 + sec) * TICKS_PER_SEC + msec
end

local function getDateValue(a)
    if (getmetatable(a) == Date) then
        return a:getTime()
    end
    return tonumber(a)
end

local function cast_date(tm)
    return setmetatable(tm, Date)
end


local function createDate(year, month, day, hour, min, sec, msec)
    return cast_date {
        year  = year;
        month = month;
        day   = day;
        hour  = hour;
        min   = min;
        sec   = sec;
        msec  = msec or 0;
    }
end

local function cloneDate(self)
    local result = createDate(unpackDate(self))
    result._timestamp = self._timestamp
    result.tzOffset = self.tzOffset
    return result
end

local function createDateFromTimestamp(ts)
    local cacheKey = 'pd:' .. toStr(ts)
    local res = functionCache(cacheKey)
    if (res == nil) then
        ts = assert(tonumber(ts), "bad argument #1 to 'createDateFromTimestamp' (number expected, got " .. type(ts) .. ")", 2)
        local secs = idiv(ts, 1000)
        local ms = math.floor(ts - (secs * 1000))
        res = createDate(1970, 1, 1, 0, 0, secs, ms)
        res._timestamp = ts
        normalizeDate(res)
        functionCache[cacheKey] = res
    end
    return res
end

local DATETIME_REGEX = "(%d+)%-(%d+)%-(%d+)%a(%d+)%:(%d+)%:([%d%.]+)([Z%+%- ])(%d?%d?)%:?(%d?%d?)"

--- Parse an RFC 3339 datetime at the given position
-- Returns a time table and the `tz_offset`
-- Return value is not normalised (this preserves a leap second)
-- If the timestamp is only partial (i.e. missing "Z" or time offset) then `tz_offset` will be nil
-- TODO: Validate components are within their boundarys (e.g. 1 <= month <= 12)
local function rfc_3339(str, init)
    local year, month, day, hour, min, sec, patt_end = str:match("^(%d%d%d%d)%-(%d%d)%-(%d%d)[Tt](%d%d%.?%d*):(%d%d):(%d%d)()", init) -- luacheck: ignore 631
    if not year then
        return nil, "Invalid RFC 3339 timestamp"
    end
    local fraction = 0
    local millis = 0
    year  = tonumber(year, 10)
    month = tonumber(month, 10)
    day   = tonumber(day, 10)
    hour  = tonumber(hour, 10)
    min   = tonumber(min, 10)

    sec, fraction = math.modf( tonumber(sec, 10) )
    if (fraction ~= nil) then
        fraction = tonumber('0.' ..fraction, 10)
        millis = math.floor(fraction * 1000)
    end

    local tt = createDate(year, month, day, hour, min, sec, millis)

    local tz_offset
    if str:match("^[Zz]", patt_end) then
        tz_offset = 0
    else
        local hour_offset, min_offset = str:match("^([+-]%d%d):(%d%d)", patt_end)
        if hour_offset then
            tz_offset = tonumber(hour_offset, 10) * 3600 + tonumber(min_offset, 10) * 60
        else -- luacheck: ignore 542
            -- Invalid RFC 3339 timestamp offset (should be Z or (+/-)hour:min)
            -- tz_offset will be nil
        end
    end
    tt.tzOffset = (tz_offset or 0) * 1000

    return tt, tz_offset
end

local function parseDate(value)
    local functionCache = functionCache
    local t = getType(value)
    if (t == 'nil') then return nil end
    local res
    local cacheKey = 'pd:'
    if (t == 'string') then
        cacheKey = cacheKey .. value
        res = functionCache[cacheKey]
        if (res == nil) then
            res = rfc_3339(value)
            functionCache[cacheKey] = res
        end
    elseif (t == 'number') then
        cacheKey = cacheKey .. value
        if (res == nil) then
            res = createDateFromTimestamp(value)
            functionCache[cacheKey] = res
        end
    elseif (t == 'date') then
        --- note that all values are immutable, so we can return the original
        res = value
    end
    return res
end

local function dateToString(self)
    local year, month, day, hour, min, sec, msec = unpackDate(self)
    return string.format("%04u-%02u-%02uT%02u:%02u:%02d.%03d", year, month, day, hour, min, sec, msec)
end

-------------------- DATE METATABLE -----------------------------------------------------------------------

local function ensureDateUTC(self)
    if (self._utc == nil) then
        local offset = self.tzOffset or 0
        if (offset == 0) then
            self._utc = self
        else
            local ts = self:getTime() + offset
            self._utc = createDateFromTimestamp(ts)
        end
    end
    return self._utc
end

local function getUTCProp(self, name)
    local utc = ensureDateUTC(self)
    return utc[name]
end

function Date.__add(a, b)
    local left = getDateValue(a)
    local right = getDateValue(b)
    local res = left + right
    if (isDate(a)) then
        return createDateFromTimestamp(res)
    end
    return res
end

function Date.__eq(a, b)
    local left = getDateValue(a)
    local right = getDateValue(b)
    return left == right
end

function Date.__lt(a, b)
    local left = getDateValue(a)
    local right = getDateValue(b)
    return left < right
end

function Date.__le(a, b) -- not really necessary, just improves "<=" and ">" performance
    local lhs = getDateValue(a)
    local rhs = getDateValue(b)
    return lhs <= rhs
end

function Date.__sub(a, b)
    local left = getDateValue(a)
    local right = getDateValue(b)
    return left - right
end

function Date.__tostring()
    return dateToString(self)
end

function Date:getFullYear() return self.year; end
function Date:getMonth() return self.month; end
function Date:getDate() return self.day end
function Date:getDay() return getDayOfWeek(self.day, self.month, self.year) end
function Date:getHours() return self.hour; end
function Date:getMinutes() return self.min; end
function Date:getSeconds() return self.sec; end
function Date:getMilliseconds() return self.msec; end

function Date:getUTCFullYear() return getUTCProp(self, 'year') end
function Date:getUTCMonth() return getUTCProp(self, 'month') end
function Date:getUTCDate() return getUTCProp(self, 'day') end
function Date:getUTCDay()
    local utc = ensureDateUTC(self)
    return getDayOfWeek(utc.day, utc.month, utc.year)
end
function Date:getUTCHours() return getUTCProp(self, 'hour') end
function Date:getUTCMinutes() return getUTCProp(self, 'min') end
function Date:getUTCSeconds() return getUTCProp(self, 'sec') end
function Date:getUTCMilliseconds() return getUTCProp(self, 'msec') end
function Date:getTime()
    if (self._timestamp == nil) then
        self._timestamp = getTimestamp( unpackDate(self) )
    end
    return self._timestamp
end
function Date:getDayOfYear() return getDayOfYear(self.day, self.month, self.year) end
function Date:rfc3339() return dateToString(self) end

------------------------------------------------------------------------------------------------------------

local function toDate(value, ...)
    local num = nil
    local t = type(value)
    if isDate(value) then return value end
    if t == 'string' then
        local ok = pcall(function()
            num = parseDate(value)
        end)
        if not ok then
            return nil
        end
        return num
    elseif (t == 'number') then
        num = trunc(value)
    elseif (t == 'function') then
        num = toNum(value(...))
    end
    assert(isNumber(num), 'Invalid date value: "' .. tostring(value) ..'"')
    return createDateFromTimestamp(num)
end


local function getDateUTC(...)
    local _args = {...}

    local names = {'year', 'month', 'day', 'hour', 'minute', 'seconds', 'milliseconds'}

    local function parse(index, min, max, defaultValue)
        local name = names[index]
        local val = _args[index]
        defaultValue = defaultValue or 0
        if (val == nil) then
            if (defaultValue == nil) then
                error( 'DateUTC: expected value for ' .. name)
            end
            return defaultValue
        end
        val = assert(tonumber(val), 'Number expected for ' .. name .. ' parameter ')
        assert(val >= min and val <= max, name .. ' should be between ' .. toStr(min) .. ' and ' .. toStr(max))
        return val
    end

    local year = parse(1, 1, 6000)
    local month = parse(2, 0, 11)
    local day = parse(3, 1, 31)
    local hour = parse(4,  0, 11)
    local minute = parse(5, 0, 23)
    local second = parse(6, 0, 59)
    local ms = parse(7, 0, 59)

    local ts = getTimestamp(year, month, day, hour, minute, second, ms)
    return createDateFromTimestamp(ts)
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
    if (atype == 'number' or atype == 'date') then
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
    ['!!'] = function(value) return not isJsFalsy(value) end,
    ['-'] = function(value) return -1 * toDouble(value) end,
    ['+'] = toNum,
    ['typeof'] = getType
}

local BinaryOps = {
    ['&&'] = function(left, right) return toBool(left) and toBool(right) end,
    ['||'] = function(a, b) return toBool(a) or toBool(b) end,
    ['??'] = function(a, b) return isNil(a) and b or a end,
    ['^'] = xor,
    ['=='] = isEqual,
    ['==='] = isEqual,
    ['!='] = function(a, b) return a ~= b end,
    ['!=='] = function(a, b) return a ~= b end,
    ['<>'] = function(a, b) return a ~= b end,
    ['<'] = createCompareFn(function(x, y) return x < y end),
    ['<='] = createCompareFn(function(x, y) return x <= y end),
    ['>'] = createCompareFn(function(x, y) return x > y end),
    ['>='] = createCompareFn(function(x, y) return x >= y end),
    ['+'] = handleAdd,
    ['-'] = createMathBinOp(function(a, b) return a - b end),
    ['*'] = createMathBinOp(function(a, b) return a * b end),
    ['%'] = createMathBinOp(function(a, b) return a % b end),
    ['/'] = createMathBinOp(function(a, b) return a / b; end),
    ['xor'] = xor,
    ["=~"] = stringMatches,
    ["!~"] = function (str, pattern) return not stringMatches(str, pattern) end,
    ['in'] = handleIn,
    ['instanceof'] = instanceof
}

--- EXPRESSION FUNCTIONS -------------------------------------------------------------

local function createMathFn(name)
    local fn = math[name]
    return function(ignored, val)
        local t = type(val)
        if (t == 'number') then
            return fn(val)
        end
        if (isNil(val)) then
            return nil
        end
        --- todo: NaN
        assert(false, 'Math.' .. name .. ': argument must resolve to a number. Got "' .. toStr(val) .. '"')
    end
end

local MathOps = {
    ['PI'] = math.pi,
    ['abs'] = createMathFn('abs'),
    ['acos'] = createMathFn('acos'),
    ['atan'] = createMathFn('atan'),
    ['ceil'] = createMathFn('ceil'),
    ['cos'] = createMathFn('cos'),
    ['floor'] = createMathFn('floor'),
    ['pow'] = createMathFn('pow'),
    ['sin'] = createMathFn('sin'),
    ['sqrt'] = createMathFn('sqrt'),
    ['tan'] = createMathFn('tan'),
    ['log'] = createMathFn('log'),
    ['log10'] = createMathFn('log10'),
    ['round'] = function(_, val, places) return round(val, places) end,
    ['sign'] = function(_, val) return sign(val) end,
    ['trunc'] = function(_, val, places) return trunc(val, places) end,
    ['min'] = function(_, ...)
        local arr = {...}
        return arrayMin(arr)
    end,
    ['max'] = function(_, ...)
        local arr = {...}
        return arrayMax(arr)
    end,
    ['avg'] = function(_, ...)
        local arr = {...}
        return arrayAvg(arr)
    end,
}

local DateOps = {
    parse = function(_, val) return parseDate(val) end,
    UTC = getDateUTC
}

local JSONOps = {
    parse = function(val)
        if (type(val) ~= 'string') then return nil end
        local ok, res = pcall(cjson.decode, val)
        return ok and res or nil
    end,
    stringify = function(val)
        local ok, res = pcall(cjson.encode, val)
        return ok and res or nil
    end
}

local ObjectOps = {
    keys = objectKeys,
    values = objectValues,
    entries = objectEntries,
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
    ["replace"] = stringReplace,
    ['strcasecmp'] = strcasecmp,
    ["substr"] = substr,
    ["substring"] = substring,
    ["split"] = splitString,
    ["slice"] = stringSlice
}

local ArrayMethods = {
    pop = arrayPop,
    push = arrayPush,
    concat = arrayConcat,
    shift = arrayShift,
    unshift = arrayUnshift,
    join = arrayJoin,
    indexOf = arrayIndexOf,
    includes = arrayIncludes,
    includesAll = arrayAll,
    reverse = arrayReverse,
    keys = objectKeys,
    slice = arraySlice,
    min = arrayMin,
    max = arrayMax,
    avg = arrayAvg
}

local ObjectMethods = {
    ["getOwnPropertyNames"] = objectKeys,
    ["toString"] = toStr,
}

local ObjectTypeMethods = {
    ["string"] = StringMethods,
    ["array"] = ArrayMethods,
    ["object"] = ObjectMethods,
    ["number"] = {
        ["toString"] = toStr,
    }
}

local Functions = {
    parseBoolean = toBool,
    parseDate = toDate,
    parseFloat = toDouble,
    parseInt = toInt,
    toString = toStr,
    isString = isString,
    isNumber = isNumber,
    isNaN = isNaN,
    isArray = isArray,
    isEmpty = isEmpty,
    ms = ms,
    ifNull = function(value, alternate) return isNil(value) and alternate or value end,
    strcasecmp = strcasecmp,
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

    local function getJsonFn(raw)
       local result = -1
       return function()
            if (result == -1) then
                if (type(raw) == 'string') then
                    local ok, res = pcall(cjson.decode, raw)
                    result = ok and res or raw
                else
                    result = raw
                end
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
                self[key] = getJsonFn(val)
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

    function self.runtime()
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
            return processedOn - timestamp
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
    local member = pop()
    local valueType = getType(member)
    local name = tok.name
    local fn
    if (valueType == 'object' or valueType == 'date') then
        fn = member[name]
    end
    if (fn == nil) then
        fn = (ObjectTypeMethods[valueType] or {})[name]
    end
    assert(type(fn) == 'function', 'Unknown method: "' .. name .. '" on type: "' .. valueType .. '"')
    assert(tok.argc <= #stack, 'Too few args on stack for method: "' .. name .. '"')
    local args = { member }
    for i = 1, tok.argc do
        args[i + 1] = pop()
    end
    return fn( unpack(args) )
end


local fieldHandlers = {}

local TypeProps = {
    ["string"] = {
        ['length'] = function(value) return #value end
    },
    ["array"] = {
        ['length'] = function(value) return #value end
    }
}

--- resolve a prop ignoring dotted paths
local function simpleResolve(value, key)
    if (value == cjson.null) then
        return cjson.null
    end
    local valueOrFn = value[key]
    if (type(valueOrFn) == 'function') then
        return valueOrFn(value)
    elseif (valueOrFn == nil) then
        local objectType = getType(value)
        local propTable = TypeProps[objectType] or {}
        local fn = propTable[key]
        --- debug("here getting prop value.  " .. toStr(value) .. '.' .. key)
        if (fn) then return fn(value) end
    end
    return valueOrFn
end

local function getPropValue(object, propertyName, objectType)
    local propTable = TypeProps[objectType] or {}
    local fn = propTable[propertyName]
    --- debug("here getting prop value.  " .. toStr(object) .. '.' .. propertyName)
    if (fn == nil) then
        debug('Resolver not found')
    end
    return fn and fn(object) or nil
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

    debug('============================= EVALUATION ==================================')
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
    functionCache = {}
    local scanResult = {}
    local match = keyPrefix .. '*'
    local fullScan = false

    local keyType = ''
    local itemCount = 0;

    if (key ~= nil and #key > 0) then
        redis.call("TYPE", key)
        keyType = keyType["ok"]
    end

    if (keyType == 'zset') then
        itemCount = redis.call('zcard', key)
        scanResult = redis.call('zscan', key, cursor, "COUNT", count, 'MATCH', match)
    elseif keyType == 'set' then
        itemCount = redis.call('scard', key)
        scanResult = redis.call('sscan', key, cursor, "COUNT", count, 'MATCH', match)
    elseif keyType == 'hash' then
        itemCount = redis.call('hlen', key)
        scanResult = redis.call('hscan', key, cursor, "COUNT", count, 'MATCH', match)
    else
        fullScan = true
        itemCount = redis.call('dbsize')
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
        scannedJobIds = map(scannedJobIds, function(val) return val[1] end)
    end

    local result = { newCursor, 0, itemCount }
    --- second item is placeholder for items processed this call

    local context = {
        ["Math"] = MathOps,
        ["Date"] = DateOps,
        ["Object"] = ObjectOps,
        ["JSON"] = JSONOps
    }

    debug("===================== EXPRESSION ========================")
    debug(toStr(criteria))

    local n = 0
    local jobSeen = {}

    for _, jobId in pairs(scannedJobIds) do
        --- iteration can visit an id more than once
        if not jobSeen[jobId] then
            jobSeen[jobId] = true

            local job = Job(keyPrefix .. jobId, jobId)

            if (job.found) then
                context['job'] = job
                context['this'] = job
                if (eval(criteria, context)) then
                    table.insert(result, "jobId")
                    table.insert(result, jobId)

                    local hash = job._jobHash;
                    for _, value in pairs(hash) do
                        table.insert(result, value)
                    end
                end
            end
        end
        n = n + 1
    end

    result[2] = n

    return result
end

local key = KEYS[1]
local prefix = assert(ARGV[1], 'Key prefix not specified')
local criteria = assert(cjson.decode(ARGV[2]), 'Invalid filter criteria. Expected a JSON encoded string')
local cursor = ARGV[3]
local count = ARGV[4] or 10

return search(key, prefix, criteria, cursor, count)

-- TODO: validate expression
