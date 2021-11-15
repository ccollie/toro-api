--- @include "sign"
--- @include "round"
--- @include "truncate"

local function createMathFn(name)
    local fn = math[name]
    return function(val)
        local fn = fn
        local name = name
        if (val == nil or val == cjson.null) then
            return cjson.null
        end
        val = assert(tonumber(val), 'Math.' .. name .. ': argument must resolve to a number. Got "' .. toStr(val) .. '"')
        return fn(val)
    end
end

local mathMethods = {
    PI = math.pi,
    abs = createMathFn('abs'),
    acos = createMathFn('acos'),
    atan = createMathFn('atan'),
    ceil = createMathFn('ceil'),
    cos = createMathFn('cos'),
    floor = createMathFn('floor'),
    pow = createMathFn('pow'),
    sin = createMathFn('sin'),
    sqrt = createMathFn('sqrt'),
    tan = createMathFn('tan'),
    log = createMathFn('log'),
    log10 = createMathFn('log10'),
    round = round,
    sign = sign,
    trunc = truncate
}

local function __math_extrema(name, items, comparator)
    local t = type(items)
    if (t == "number") then
        -- take a short cut if expr is number literal
        return items
    end
    if (t == "nil" or t == cjson.null) then
        return cjson.null
    end
    assert(t == "table", name .. ' expects an array of numbers')
    local res = cjson.null
    for _, n in ipairs(items) do
        local v = tonumber(n)
        if (v == nil) then return cjson.null end
        if (res == cjson.null or comparator(v, res)) then
            res = n
        end
    end
    return res
end

function mathMethods.max(...)
    local items = { ... }
    return __math_extrema('max', items, function(x, y) return x > y end)
end

function mathMethods.min(...)
    local items = { ... }
    return __math_extrema('min', items, function(x, y) return x < y end)
end

local function __sum(...)
    local total, n = 0, 0
    local args = { ... }
    for _, val in ipairs(args) do
        val = tonumber(val)
        if (val == nil) then
            return cjson.null
        end
        total = total + val
        n = n + 1
    end
    return total, n
end

function mathMethods.sum(...)
    local t = __sum(...)
    return t
end

function mathMethods.avg(...)
    local total, n = __sum(...)
    if (total == cjson.null) then return total end
    return n == 0 and 0 or (total / n)
end
