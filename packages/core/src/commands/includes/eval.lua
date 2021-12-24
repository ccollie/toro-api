
--- @include "debug.lua"
--- @include "date.lua"
--- @include "toBool.lua"
--- @include "isFalsy.lua"
--- @include "isTruthy.lua"
--- @include "operators.lua"
--- @include "isNil.lua"
--- @include "isArray.lua"
--- @include "isDate.lua"
--- @include "isEmpty.lua"
--- @include "isString.lua"
--- @include "isNumber.lua"
--- @include "ms.lua"
--- @include "getType.lua"
--- @include "arrayMethods.lua"
--- @include "mathMethods.lua"
--- @include "stringMethods.lua"
--- @include "jsonMethods.lua"
--- @include "objectMethods.lua"

local ExprEval = {}
ExprEval.__index = ExprEval

--- todo: cache dates
local DateOps = {
    parse = date_create,
    isLeapYear = date.isLeapYear,
    epoch = date.epoch
}

local TypeProps = {
    string = {
        length = function(value) return #value end
    },
    array = {
        length = function(value) return #value end
    },
    table = {
        length = function(value) return #value end
    }
}

local ObjectTypeMethods = {
    string = stringMethods,
    array = arrayMethods,
    table = objectMethods,
    object = objectMethods,
    number = {
        toString = toStr,
    }
}

local Ctors = {
    Date = date
}

-- globals
local EXPR_GLOBALS = {
    Math = mathMethods,
    JSON = jsonMethods,
    Object = objectMethods,
    Date = DateOps,
    parseBoolean = toBool,
    parseDate = date,
    parseFloat = toDouble,
    parseInt = toInt,
    toString = toStr,
    isString = isString,
    isNumber = isNumber,
    isArray = isArray,
    isEmpty = isEmpty,
    ms = ms,
    strcasecmp = stringMethods.strcasecmp,
    typeof = getType,
    cmp = function(a, b)
        if (a < b) then
            return -1
        end
        if (a > b) then
            return 1
        end
        return 0
    end
}

function ExprEval.evaluateArray(list, context, res)
    res = res or {}
    local len = #res
    local eval = ExprEval.evaluate
    -- assumes non-sparse arrays
    for i, v in ipairs(list) do
        res[len + i] = eval(v, context)
    end
    return res
end

function ExprEval.getProp(object, key)
    if (object == nil or object == cjson.null) then
        return cjson.null
    end
    local val = object[key]

    debug(' getProp: key = ' .. toStr(key), ', val = ', toStr(val))
    if (val == nil or val == cjson.null) then
        local t = type(object)

        if (t == 'table') then
            --- lua's handling of tables is "special"
            val = arrayMethods[key] or objectMethods[key]
            if (val) then return val end
            --- check metatable
            debug(' getProp: checking metatable')
            local mt = getmetatable(object)
            if type(mt) =='table' then
                -- get the __index from mt, if exists
                local index = mt.__index
                if type(index) == 'table' then
                    return index[key]
                end
            end
        else
            local obj = ObjectTypeMethods[t]
            val = obj and obj[key]
        end

        if (val == nil) then
            debug('HERE 3: possibly a prop = ')
            local obj = TypeProps[t]
            if (obj) then
                local propFn = obj[key]
                val = propFn and propFn(object)
            end
        end
    end
    return val
end

function ExprEval.evalMember(node, context)
    local evaluate = ExprEval.evaluate
    local object = evaluate(node.object, context)
    local val
    local key = node.computed and evaluate(node.property, context) or node.property.name
    if (type(key) == 'number') then
        if type(object) == 'string' then
            val = stringMethods.charAt(object, key)
        else
            val = object[key+1]
        end
    else
        val = ExprEval.getProp(object, key)
    end
    return object, val, key
end

function ExprEval.MemberExpression(node, context)
    local _, value = ExprEval.evalMember(node, context)
    return value
end

function ExprEval.UnaryExpression(node, context)
    return operator.unops[node.operator](ExprEval.evaluate(node.argument, context));
end

function ExprEval.CallExpression(node, context)
    local caller, name
    local callerArg = {}

    local fn = node.fn  -- cached fn
    if (not fn) then
        local cacheable = false;
        local callee = node.callee
        if (callee.type == 'MemberExpression') then
            --- this extra work is because we anticipate expressions being executed in a loop
            --- so try to cache the function lookup
            local isBuiltIn = callee.object.type == 'Identifier' and EXPR_GLOBALS[callee.object.name]
            if isBuiltIn then
                caller, fn, name = ExprEval.evalMember(callee, EXPR_GLOBALS)
            else
                caller, fn, name = ExprEval.evalMember(callee, context)
                callerArg = { caller }
            end
            debug('Here, name = ' .. toStr(name) .. ', caller = ' .. toStr(caller))
            cacheable = isBuiltIn and not callee.computed
        else
            cacheable = callee.type == 'Identifier'
            fn = ExprEval.evaluate(callee, context)
        end
        if (type(fn) ~= 'function') then
            name = name or ExprEval.nodeFunctionName(caller or callee or node);
            --- debug('Invalid fn = ' .. toStr(fn) .. ', name = ' .. toStr(name))
            error('"' .. toStr(name) .. '" is not a function',0)
            return cjson.null
        end
        -- cache the lookup result if its not computed
        -- i.e. we ha an expression like Math.round(n) rather than user.profiles[x].roles.includes("admin")
        if (cacheable) then node.fn = fn end
    end

    local args = ExprEval.evaluateArray(node.arguments, context, callerArg)
    debug('running fn: ' .. toStr(name) .. ' with args: ' .. toStr(args))
    return fn( unpack(args) )
end

--- https://github.com/EricSmekens/jsep/blob/0d4f9f8ef9f36a6b4719d601ce9d5a896bbb4376/packages/new/test/index.test.js#L12
function ExprEval.NewExpression(node, context)
    local ctorName = node.callee.name or '<unknown>'
    local fn = Ctors[ctorName]
    if (type(fn) ~= 'function') then
        error('"' .. toStr(ctorName) .. '" is not a constructor function',0)
    end
    local args = ExprEval.evaluateArray(node.arguments, context)
    return fn( unpack(args) )
end

function ExprEval.ConditionalExpression(node, context)
    local eval = ExprEval.evaluate
    local pred = isTruthy( eval(node.test, context) )
    if pred then
        return eval(node.consequent, context)
    else
        return eval(node.alternate, context)
    end
end

function ExprEval.BinaryExpression(node, context)
    local eval = ExprEval.evaluate
    local left = eval(node.left, context)
    local op = node.operator
    local right = node.right

    if (op == '||') then
        return isTruthy(left) or isTruthy(eval(right, context))
    elseif (op == '&&') then
        return isTruthy(left) and isTruthy(eval(right, context))
    end
    return operator.binops[op](left, eval(right, context));
end

function ExprEval.ArrayExpression(node, context)
    return ExprEval.evaluateArray(node.elements, context);
end

function ExprEval.Identifier(node, context)
    local val = context[node.name] or EXPR_GLOBALS[node.name]
    return (val == nil) and cjson.null or val
end

function ExprEval.Literal(node, context)
    return node.value
end

function ExprEval.BuiltIn(node)
    local v = EXPR_GLOBALS[node.name]
    if (not v) then
        error('Unknown built-in: "' .. node.name .. '"')
    end
    return v
end

function ExprEval.ThisExpression(node, context)
    return context
end

function ExprEval.NullExpression(node, context)
    debug('Invalid handler found for node ', node)
    return cjson.null
end

function ExprEval.evaluate(node, context)
    local handler = ExprEval[node.type] or ExprEval.NullExpression
    return handler(node, context)
end

function ExprEval.nodeFunctionName(callee)
    if callee then
        local v = callee.name
        if (v == nil) then
            v = callee.property and callee.property.name or nil
        else
            return v
        end
    end
    return '<unknown>'
end


local function evalExpression(expr, context)
    debug('Context = ' .. toStr(context))
    local val = ExprEval.evaluate(expr, context or {}) --ctx
    -- Redis has some funky lua => redis conversion rules that cause
    -- unexpected results on the client. We avoid this by json encoding
    -- the result
    -- Read https://redis.io/commands/eval - specifically the section
    -- Lua to Redis
    return cjson.encode(val)
end
