--- @include "some.lua"
--- @include "inArray.lua"
--- @include "toDouble.lua"
--- @include "toBool.lua"
--- @include "isFalsy.lua"
--- @include "isTruthy.lua"
--- @include "toInt.lua"
--- @include "toNum.lua"
--- @include "getType.lua"

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
    return l < r
end

--- returns true if a is less or equal to b **<=**
-- @param a value
-- @param b value
function operator.le(a,b)
    local l, r = normalizeNils(a, b)
    return l <= r
end

--- returns true if a is greater than b **>**
-- @param a value
-- @param b value
function operator.gt(a,b)
    local l, r = normalizeNils(a, b)
    return l > r
end

--- returns true if a is greater or equal to b **>=**
-- @param a value
-- @param b value
function operator.ge(a,b)
    local l, r = normalizeNils(a, b)
    return l >= r
end

--- add two values **+**
-- @param a value
-- @param b value
function operator.add(a,b)
    local l, r = normalizeNils(a, b)
    return l + r
end

--- subtract b from a **-**
-- @param a value
-- @param b value
function operator.sub(a,b)
    local l, r = normalizeNils(a, b)
    return l - r
end

--- multiply two values __*__
-- @param a value
-- @param b value
function operator.mul(a,b)
    local l, r = normalizeNils(a, b)
    return l * r
end

--- divide first value by second **/**
-- @param a value
-- @param b value
function operator.div(a,b)
    return a/b
end

--- raise first to the power of second **^**
-- @param a value
-- @param b value
function operator.pow(a,b)
    local l, r = normalizeNils(a, b)
    return l ^ r
end

--- modulo; remainder of a divided by b **%**
-- @param a value
-- @param b value
function operator.mod(a,b)
    local l, r = normalizeNils(a, b)
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
    return -a
end

--- false if value evaluates as true **not**
-- @param a value
function operator.lnot(a)
    return not a
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
    return l or r
end

--- make a table from the arguments **{}**
-- @param ... non-nil arguments
-- @return a table
function operator.table (...)
    return {...}
end

--- match two strings **~**.
-- uses @{string.find}
function operator.match (a,b)
    return string.find(a,b)~=nil
end

-- @include "matches.lua"

function operator.matches(a, pattern)
    return matches(e, pattern)
end

function operator.noMatches(str, pattern)
    return not matches(str, pattern)
end

function operator.nullCoalesce(a, b)
    return (a == nil or a == cjson.null) and b or cjson.null
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
---- Map from operator symbol to function.
-- Most of these map directly from operators;

--  * __'~'__   `match`
--
-- @table optable
-- @field operator
operator.optable = {
    ['+']=operator.add,
    ['-']=operator.sub,
    ['*']=operator.mul,
    ['/']=operator.div,
    ['%']=operator.mod,
    ['^']=operator.pow,
    ['()']=operator.call,
    ['[]']=operator.index,
    ['<']=operator.lt,
    ['<=']=operator.le,
    ['>']=operator.gt,
    ['>=']=operator.ge,
    ['==']=operator.eq,
    ['===']=operator.eq,
    ['!=']=operator.neq,
    ['!==']=operator.neq,
    ['~=']=operator.neq,
    ['and']=operator.land,
    ['or']=operator.lor,
    ['in']=operator.lin,
    ["=~"] = operator.matches
}

local function handleAdd(a, b)
    local atype = getType(a)
    local btype = getType(b)
    local l, r = normalizeNils(a, b)

    if l == nil or r == nil then
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

operator.unops = {
    ['!'] = function(value) return not toBool(value) end,
    ['!!'] = function(value) return not isFalsy(value) end,
    ['-'] = function(value) return -1 * toDouble(value) end,
    ['+'] = toNum,
    ['typeof'] = getType
}


operator.binops = {
    ['&&'] = operator.land,
    ['||'] = function(a, b) return isTruthy(a) or isTruthy(b) end,
    ['??'] = operator.nullCoalesce,
    ['^'] = operator.pow,
    ['=='] = operator.eq,
    ['==='] = operator.eq,
    ['!='] = operator.neq,
    ['!=='] = operator.neq,
    ['<>'] = operator.neq,
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
