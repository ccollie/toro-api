--- @include "some"
--- @include "inArray"
--- @include "toDouble"
--- @include "toBool"
--- @include "isFalsy"
--- @include "isTruthy"
--- @include "isNil"
--- @include "toInt"
--- @include "toNum"
--- @include "getType"
--- @include "debug"
--- @include "toStr"

local operator = {}

local function normalizeNils(a, b)
    if (a == cjson.null) then a = nil end
    if (b == cjson.null) then b = nil end
    return a, b
end

--- get the indexed value from a table **[]**
-- @param t a table or any indexable object
-- @param k the key
function operator.index(t,k)
    return t[k]
end

--- returns true if arguments are equal **==**
-- @param a value
-- @param b value
function operator.eq(a,b)
    local l, r = normalizeNils(a, b)
    return l == r
end

--- returns true if arguments are not equal **~=**
-- @param a value
-- @param b value
function operator.neq(a,b)
    local l, r = normalizeNils(a, b)
    return l ~= r
end

--- returns true if a is less than b **<**
-- @param a value
-- @param b value
function operator.lt(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l < r
end

--- returns true if a is less or equal to b **<=**
-- @param a value
-- @param b value
function operator.le(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l <= r
end

--- returns true if a is greater than b **>**
-- @param a value
-- @param b value
function operator.gt(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l > r
end

--- returns true if a is greater or equal to b **>=**
-- @param a value
-- @param b value
function operator.ge(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l >= r
end

--- add two values **+**
-- @param a value
-- @param b value
function operator.add(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    if (type(l) == 'string') then return l .. r end
    return l + r
end

--- subtract b from a **-**
-- @param a value
-- @param b value
function operator.sub(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l - r
end

--- multiply two values __*__
-- @param a value
-- @param b value
function operator.mul(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l * r
end

--- divide first value by second **/**
-- @param a value
-- @param b value
function operator.div(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return a/b
end

--- raise first to the power of second **^**
-- @param a value
-- @param b value
function operator.pow(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l ^ r
end

--- modulo; remainder of a divided by b **%**
-- @param a value
-- @param b value
function operator.mod(a,b)
    local l, r = normalizeNils(a, b)
    if (l == nil or r == nil) then return cjson.null end
    return l % r
end

--- concatenate two values (either strings or `__concat` defined) **..**
-- @param a value
-- @param b value
function operator.concat(a,b)
    return a..b
end

--- return the negative of a value **-**
-- @param a value
function operator.unm(a)
    if (isNil(a)) then return cjson.null end
    return -a
end

--- false if value evaluates as true **not**
-- @param a value
function operator.lnot(a)
    return not isTruthy(a)
end

--- true if both values evaluate as true **and**
-- @param a value
-- @param b value
function operator.land(a,b)
    local l, r = normalizeNils(a, b)
    return l and r
end

--- true if either value evaluate as true **or**
-- @param a value
-- @param b value
function operator.lor(a,b)
    local l, r = normalizeNils(a, b)
    return isTruthy(l) or isTruthy(r)
end

--- match two strings **~**.
-- uses @{string.find}
function operator.match (a,b)
    return string.find(a,b)~=nil
end

-- @include "matches.lua"

function operator.matches(a, pattern)
    return isTruthy( matches(a, pattern) )
end

function operator.noMatches(str, pattern)
    return not operator.matches(str, pattern)
end

function operator.nullCoalesce(a, b)
    return (a == nil or a == cjson.null) and b or a
end

function operator.lin(needle, haystack)
    -- assert(isArray(b), '')
    -- queries for null should be able to find undefined fields
    if (needle == nil or needle == cjson.null) then
        return some(haystack, isNil)
    end
    if (type(needle) ~= 'table') then
        return inArray(needle, haystack)
    end
    for _, v in ipairs(needle) do
        if not inArray(haystack, v) then
            return false
        end
    end
    return true
end

function operator.xor(a, b)
    local atype = type(a)
    assert(atype == 'boolean' or atype == "number", 'Unexpected operand type "' .. atype ..' in xor"')
    if (atype == 'boolean') then
        return a ~= b
    elseif (atype == 'number') then
        return bitop.bxor(a, toInt(b))
    end
end

operator.unops = {
    ['!'] = operator.lnot,
    ['!!'] = isTruthy,
    ['-'] = function(value) return isNil(value) and cjson.null or (-1 * toDouble(value)) end,
    ['+'] = toNum,
    ['typeof'] = getType
}

operator.binops = {
    ['&&'] = operator.land,
    ['||'] = operator.lor,
    ['??'] = operator.nullCoalesce,
    ['^'] = operator.pow,
    ['=='] = operator.eq,
    ['==='] = operator.eq,
    ['!='] = operator.neq,
    ['!=='] = operator.neq,
    ['<'] = operator.lt,
    ['<='] = operator.le,
    ['>'] = operator.gt,
    ['>='] = operator.ge,
    ['+'] = operator.add,
    ['-'] = operator.sub,
    ['*'] = operator.mul,
    ['%'] = operator.mod,
    ['/'] = operator.div,
    ['xor'] = operator.xor,
    ["=~"] = operator.matches,
    ["!~"] = operator.notMatches,
    ['in'] = operator.lin
}
