-- @include "isNil"
-- @include "isString"
-- @include "debug"
-- @include "split"
-- @include "absIndex"

local stringMethods = {}

--- String Functions ------------------------------------------
--- NOTE: all functions requiring indices expect them to start at 0 to match js
function stringMethods.substr(s, start, count)
    if (isNil(s)) then
        return nil
    end
    assert(isString(s), 'substr: expected string as first argument')
    local len = #s

    start = absIndex(len, start, true)
    if (start > len) then return '' end

    count = assert(tonumber(count or len), 'substr: count should be a number')
    if (count < 0) then
        return ''
    end
    return s:sub(start, start + count - 1)
end

function stringMethods.substring(s, startIndex, endIndex)
    if (isNil(s)) then
        return nil
    end
    local len = #s

    assert(isString(s), 'substring(): expected string as first argument')
    if (endIndex == nil or endIndex == cjson.null) then
        endIndex = len
    else
        endIndex = assert(tonumber(endIndex or len), 'substring(): expected number for endIndex')
        endIndex = absIndex(len, endIndex, true)
    end
    startIndex = absIndex(len, startIndex or 0, true)

    return s:sub(startIndex, endIndex)
end

function stringMethods.slice(s, startIndex, endIndex)
    if (isNil(s)) then
        return nil
    end

    assert(isString(s), 'slice(): expected string as first argument')
    local len = string.len(s)
    if (endIndex == nil or endIndex == cjson.null) then
        endIndex = len
    else
        endIndex = assert(tonumber(endIndex), 'slice(): expected number for endIndex')
        endIndex = absIndex(len, endIndex, true) - 1
    end
    startIndex = absIndex(len, startIndex or 0, true)

    if (startIndex > len) then
        return ''
    end
    -- lua indexes start at 1
    return s:sub(startIndex, endIndex)
end

function stringMethods.toLowerCase(value)
    if (isNil(value)) then
        return nil
    end
    assert(isString(value), 'toLower: string expected')
    return #value > 0 and string.lower(value) or ''
end

function stringMethods.toUpperCase(value)
    if (isNil(value)) then
        return nil
    end
    assert(isString(value), 'toUpper: string expected')
    return #value > 0 and string.upper(value) or ''
end

function stringMethods.includes(haystack, needle, start)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local len = #needle
    start = assert(start or 0, 'string.includes: start should be a number')
    start = absIndex(len, start, true)
    if (#haystack >= len) and haystack:find(needle, start, true) then
        return true
    else
        return false
    end
end

function stringMethods.startsWith(haystack, needle, start)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local len = #needle
    start = assert(start or 0, 'string.startsWith: start should be a number')
    start = absIndex(len, start, true)
    return (#haystack >= len) and (haystack:sub(start, len) == needle)
end

function stringMethods.endsWith(haystack, needle)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local len = #needle
    return len == 0 or ((#haystack >= len) and (haystack:sub(-len, -1) == needle))
end

function stringMethods.charAt(str, idx)
    -- assert(isArray(arr), 'First operand to string.charAt must resolve to a string');
    idx = assert(tonumber(idx), 'string index must be an integer')
    idx = absIndex(#str, idx, true)
    if (idx < len) then
        return str:sub(idx, idx)
    end
    return nil
end

--- https://github.com/lunarmodules/Penlight/blob/master/lua/pl/stringx.lua
local function _find_all(s,sub,first,last,allow_overlap)
    local find = string.find
    first = first or 1
    last = last or #s
    if sub == '' then return last+1,last-first+1 end
    local i1,i2 = find(s,sub,first,true)
    local res
    local k = 0
    while i1 do
        if last and i2 > last then break end
        res = i1
        k = k + 1
        if allow_overlap then
            i1,i2 = find(s,sub,i1+1,true)
        else
            i1,i2 = find(s,sub,i2+1,true)
        end
    end
    return res,k
end


--- find index of first instance of sub in s from the right.
-- @string s the string
-- @string sub substring
-- @int[opt] first first index
-- @int[opt] last last index
-- @return start index, or nil if not found
function stringMethods.lastIndexOf(s,sub,first,last)
    assert(isString(sub), 'indexOf: expected a string as the second argument')
    first = assert(tonumber(first or 0), "indexOf: start index should be a number")
    first = absIndex(#s, first, true)

    local v = (_find_all(s,sub,first,last,true))
    return v and (v - 1) or -1
end

function stringMethods.indexOf(haystack, needle, start)
    if (isNil(haystack)) then
        return cjson.null
    end
    assert(isString(haystack), 'indexOf: expected a string as the first argument')
    assert(isString(needle), 'indexOf: expected a string as needle')
    start = assert(tonumber(start or 0), "indexOf: start index should be a number")
    --- convert from 0 to 1 based indices
    start = absIndex(#haystack, start, true)

    local index, _ = haystack:find(needle, start, true)
    if (index ~= nil) then
        return index - 1
    end
    return -1
end

--function stringMethods.lastIndexOf(haystack, needle, fromIndex)
--    local length = string.len(haystack)
--    if (fromIndex == nil) then
--        fromIndex = length
--    end
--
--    if (fromIndex < 0) then fromIndex = 0 end
--
--    -- translate to lua 1-based indexes
--    fromIndex = fromIndex + 1
--    if (fromIndex > length) then fromIndex = length end
--
--    local i, j
--    local k = fromIndex
--    repeat
--        i = j
--        j, k = haystack:find(needle, k + 1, true)
--    until j == nil
--
--    return i - 1
--end

local function _trim(name, input, chars, left, right)
    if (input == cjson.null or input == nil) then
        return cjson.null
    end
    assert(isString(input), name .. ': missing input')
    if (#input == 0) then
        return ''
    end
    if not chars then
        chars = '%s'
    else
        chars = '['.. stringMethods.regexEscape(chars) ..']'
    end
    local f = 1
    local t
    local find = string.find
    if left then
        local i1,i2 = find(input,'^'..chars..'*')
        if i1 and (i2 >= i1) then
            f = i2+1
        end
    end
    if right then
        if (#input < 200) then
            local i1,i2 = find(input,chars.."*$", f)
            if i1 and (i2 >= i1) then
                t = i1-1
            end
        else
            local rs = string.reverse(s)
            local i1,i2 = find(rs, '^'..chars..'*')
            if i1 and (i2 >= i1) then
                t = -i2-1
            end
        end
    end

    return string.sub(input, f, t)
end

function stringMethods.trim(input, chars)
    return _trim('trim', input, chars,true, true)
end

function stringMethods.trimStart(input, chars)
    return _trim('ltrim', input, chars,true, false)
end

function stringMethods.trimEnd(input, chars)
    return _trim('rtrim', input, chars, false, true)
end

function stringMethods.splitString(s, delimiter)
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

function stringMethods.split (str, sep, n)
    return split(str, sep, n)
end

function stringMethods.concat(str, ...)
    local args = { ... }
    assert(isString(str), 'String.concat: string required');
    for _, v in ipairs(args) do
        str = str .. toStr(v)
    end
    return str
end

function stringMethods.strcasecmp(a, b)
    assert(isString(a) and isString(b), 'Invalid parameters to strcasecmp')

    a = a:upper()
    b = b:upper()

    if (a > b) then
        return 1
    end
    return (a < b) and -1 or 0
end

-- @include "matches.lua"

function stringMethods.match(a, pattern)
    if (isNil(pattern)) then
        return cjson.null
    end
    return matches(a, pattern)
end

function stringMethods.regexEscape(str)
    return str:gsub("[%(%)%.%%%+%-%*%?%[%^%$%]]", "%%%1")
end

-- return function (str, this, that) -- modify the line below for the above to work
function stringMethods.replace(str, this, that)
    return str:gsub(stringMethods.regexEscape(this), that:gsub("%%", "%%%%")) -- only % needs to be escaped for 'that'
end
