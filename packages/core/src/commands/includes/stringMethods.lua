-- @include "isNil"
-- @include "isString"
-- @include "debug"

local stringMethods = {}

--- String Functions ------------------------------------------
---
function stringMethods.substr(s, start, count)
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

function stringMethods.substring(s, startIndex, endIndex)
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

function stringMethods.slice(s, startIndex, endIndex)
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

function stringMethods.toLower(value)
    if (isNil(value)) then
        return nil
    end
    assert(isString(value), 'toLower: string expected')
    return #value > 0 and string.lower(value) or ''
end

function stringMethods.toUpper(value)
    if (isNil(value)) then
        return nil
    end
    assert(isString(value), 'toUpper: string expected')
    return #value > 0 and string.upper(value) or ''
end

function stringMethods.contains(haystack, needle, start)
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

function stringMethods.startsWith(haystack, needle, start)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local plen = #needle
    start = (start or 0) + 1
    return (#haystack >= plen) and (haystack:sub(start, plen) == needle)
end

function stringMethods.endsWith(haystack, needle)
    if type(haystack) ~= 'string' or type(needle) ~= 'string' then return false end
    local slen = #needle
    return slen == 0 or ((#haystack >= slen) and (haystack:sub(-slen, -1) == needle))
end

function stringMethods.charAt(str, idx)
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

function stringMethods.indexOfString(haystack, needle, start)
    if (isNil(haystack)) then
        return cjson.null
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

function stringMethods.lastIndexOf(haystack, needle, fromIndex)
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

function stringMethods.trimInternal(name, input, chars, left, right)
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

function stringMethods.trim(input, chars)
    return stringMethods.trimInternal('trim', input, chars,true, true)
end

function stringMethods.ltrim(input, chars)
    return stringMethods.trimInternal('ltrim', input, chars,true, false)
end

function stringMethods.rtrim(input, chars)
    return stringMethods.trimInternal('rtrim', input, chars, false, true)
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

function stringMethods.split (str, sep)
    local sep, fields = sep or ".", {}
    local pattern = string.format("([^%s]+)", sep)
    str:gsub(pattern, function(c)
        fields[#fields + 1] = c
    end)
    return fields
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
    if (a < b) then
        return -1
    end
    return 0
end

-- @include "matches.lua"

function stringMethods.matches(a, pattern)
    return matches(a, pattern)
end

function stringMethods.regexEscape(str)
    return str:gsub("[%(%)%.%%%+%-%*%?%[%^%$%]]", "%%%1")
end

-- return function (str, this, that) -- modify the line below for the above to work
function stringMethods.replace(str, this, that)
    return str:gsub(stringMethods.regexEscape(this), that:gsub("%%", "%%%%")) -- only % needs to be escaped for 'that'
end
