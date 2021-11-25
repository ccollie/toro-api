
--- @include "isEqual"
--- @include "isNil"
--- @include "some"
--- @include "intersect"
--- @include "matches"
--- @include "absIndex"

local arrayMethods = {}

function arrayMethods.ensureArray(x)
    return type(x) == 'table' and x or { x }
end

function arrayMethods.push(arr, ...)
    local value = { ... }
    for _, v in ipairs(value) do
        table.insert(arr, (v == nil) and cjson.null or v)
    end
    return arr
end

function arrayMethods.pop(arr)
    local v = table.remove(arr, #arr)
    return (v == nil) and cjson.null or v
end

function arrayMethods.shift(arr)
    local v = table.remove(arr, 1);
    return (v == nil) and cjson.null or v
end

function arrayMethods.unshift(arr, ...)
    local values = { ... }
    local len = #values
    local last = len + 1
    for i=1, len do
        local v = values[last - i]
        table.insert(arr, 1, v == null and cjson.null or v);
    end
    return arr
end

function arrayMethods.reverse(arr)
    local reversed = {}
    local last = #arr + 1
    for k, v in ipairs(arr) do
        reversed[last - k] = v
    end
    return reversed
end

function arrayMethods.concat(arr, value)
    local type = type(value)
    if (type ~= 'table') then
        return table.insert(arr, value == nil and cjson.null or value)
    end
    assert(type == 'table', 'Array expected in array.concat()');
    for _, v in ipairs(value) do
        table.insert(arr, (v == nil) and cjson.null or v)
    end
    return arr
end

function arrayMethods.join(arr, glue)
    local res = ''
    local len = #arr
    if glue == nil or glue == cjson.null then
        glue = ','
    else
        glue = tostring(glue)
    end
    for _, v in ipairs(arr) do
        res = res .. tostring(v)
        if _ < len then
            res = res .. glue
        end
    end
    return res
end

function arrayMethods.elementAt(arr, idx)
    idx = assert(tonumber(idx), 'number expected for array index')
    idx = absIndex(#arr, idx, true)
    return arr[idx]
end

function arrayMethods.indexOf(haystack, needle, start)
    if (isNil(haystack)) then
        return cjson.null
    end
    start = assert(tonumber(start or 0), "indexOf: start index should be a number")

    local len = #haystack
    start = absIndex(len, start, true)

    if (len == 0 or start >= len) then
        return -1
    end

    for i = start, len do
        if (isEqual( haystack[i], needle )) then
            return i - 1
        end
    end
    return -1
end

function arrayMethods.includes(haystack, needle)
    return arrayMethods.indexOf(haystack, needle, 0) >= 0
end

-- note! slice extracts up to but not including end
function arrayMethods.slice(arr, startIndex, endIndex)
    assert(type(arr) == 'table', 'slice(): expected string as first argument')
    local length = #arr
    local res = {}
    if (endIndex == nil or endIndex == cjson.null) then
        endIndex = length
    else
        endIndex = assert(tonumber(endIndex), 'slice(): expected number for endIndex')
        endIndex = absIndex(length, endIndex, true) - 1
    end
    startIndex = absIndex(length, startIndex or 0, true)

    if (startIndex > length) then
        return res
    end

    for i = startIndex, endIndex do
        table.insert(res, arr[i])
    end
    return res
end

function arrayMethods.includesAll(a, b)
    if (type(a) == 'table' and type(b) == 'table') then
        -- order of arguments matter
        local int = intersect(b, a)
        return #b == #int
    end
    return false
end

local function extrema(name, items, comparator)
    local t = type(items)
    if (t == "number") then
        -- take a short cut if expr is number literal
        return items
    end
    if (t == "nil" or items == cjson.null) then
        return cjson.null
    end
    assert(t == "table", name .. ' expects an array of items')
    local res = cjson.null
    for _, n in ipairs(items) do
        if (res == cjson.null) then
            res = n
        elseif (n == cjson.null) then
            return cjson.null
        elseif comparator(n, res) then
            res = n
        end
    end
    return res
end

function arrayMethods.max(arr)
    return extrema('max', arr, function(x, y) return x > y end)
end

function arrayMethods.min(arr)
    return extrema('min', arr, function(x, y) return x < y end)
end

function arrayMethods.matches(arr, re)
    return matches(arr, re)
end
