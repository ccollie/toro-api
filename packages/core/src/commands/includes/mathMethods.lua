--- @include "sign"
--- @include "round"
--- @include "truncate"

local function createMathFn(name)
    local fn = math[name]
    return function(_, val)
        local t = type(val)
        if (t == 'number') then
            return fn(val)
        end
        if (val == nil or val == cjson.null) then
            return cjson.null
        end
        --- todo: NaN
        assert(false, 'Math.' .. name .. ': argument must resolve to a number. Got "' .. toStr(val) .. '"')
    end
end

local mathMethods = {
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
    ['trunc'] = function(_, val, places) return truncate(val, places) end
}

function mathMethods.extrema(name, items, comparator)
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
        if (type(n) == 'number') then
            if (res == cjson.null) then
                res = n
            elseif (comparator(n, res)) then
                res = n
            end
        end
    end
    return res
end

function mathMethods.max(expr)
    return mathMethods.extrema('max', expr, function(x, y) return x > y end)
end

function mathMethods.min(expr)
    return mathMethods.extrema('min', expr, function(x, y) return x < y end)
end

function mathMethods.sum(name, args)
    assert(type(args) == 'table', name .. ' expects an array')
    local total = 0
    for _, val in ipairs(args) do
        if type(val) == 'number' then
            total = total + val
        end
    end
    return total
end

function mathMethods.avg(args)
    local total = mathMethods.sum('avg', args)
    if total == 0 then
        return 0
    end
    return total / #args
end
