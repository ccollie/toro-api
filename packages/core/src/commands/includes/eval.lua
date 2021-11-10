---
--- Evaluation code from JSEP project, under MIT License.
--- Copyright (c) 2013 Stephen Oney, http://jsep.from.so/
---

--- @include "debug.lua"
--- @include "date.lua"
--- @include "toBool.lua"
--- @include "isFalsy.lua"
--- @include "isTruthy.lua"
--- @include "operators.lua"
--- @include "isNaN.lua"
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
    parse = function(_, ...) return date(...) end,
    isLeapYear = function(_, d) return date.isLeapYear(d) end
}

local TypeProps = {
    ["string"] = {
        ['length'] = function(value) return #value end
    },
    ["array"] = {
        ['length'] = function(value) return #value end
    },
    ["table"] = {
        ['length'] = function(value) return #value end
    }
}

local ObjectTypeMethods = {
    ["string"] = stringMethods,
    ["array"] = arrayMethods,
    ["table"] = objectMethods,
    ["object"] = objectMethods,
    ["number"] = {
        ["toString"] = toStr,
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
    isNaN = isNaN,
    isArray = isArray,
    isEmpty = isEmpty,
    ms = ms,
    strcasecmp = stringMethods.strcasecmp,
    typeof = getType,
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

function ExprEval.evaluateArray(list, context, res)
    res = res or {}
    local i = #res + 1
    local eval = ExprEval.evaluate
    for _, v in ipairs(list) do
        res[i] = eval(v, context)
        i = i + 1
    end
    return res
end

function ExprEval.getProp(object, key)
    if (type(key) == 'number') then key = key + 1 end
    local val = object[key]

    debug(' getProp: key = ', toStr(key), ', val = ', val)
    if (val == nil or val == cjson.null) then
        local t = type(object)
        debug('Here 1D, object Type = ', t, ' object = ', object)

        --- all because of lua's handling of tables
        if (t == 'table') then
            val = arrayMethods[key] or objectMethods[key]
        else
            local obj = ObjectTypeMethods[t]
            val = obj and obj[key]
            if (isTruthy(val)) then
                debug(t .. ' Method ',  key)
            end
        end

        if (val == nil) then
            debug('HERE 3: possibly a prop = ')
            local obj = TypeProps[t]
            if (obj) then
                val = obj[key] and obj[key](object)
            end
        end
    end
    return val
end

function ExprEval.evalMember(node, context)
    local eval = ExprEval.evaluate
    local getProp = ExprEval.getProp

    local object = context
    local val, key
    local saveObj
    debug('EvalMember. Node = ', node)
    for _, segment in ipairs(node.path) do

        local t = segment.type
        if (t == 'Literal') then
            key = segment.value
        elseif t == 'Identifier' then
            key = segment.name
        else
            key = eval(segment, context)
        end

        val = getProp(object, key)

        if (val == nil) then
            return {saveObj, val}
        end

        saveObj = object
        object = val
    end
    return {saveObj, val}
end

function ExprEval.MemberExpression(node, context)
    debug('MemberExpression ', node)
    local value = ExprEval.evalMember(node, context)
    debug('value = ', value)
    return value[2]
end

function ExprEval.UnaryExpression(node, context)
    return operator.unops[node.operator](ExprEval.evaluate(node.argument, context));
end

function ExprEval.CallExpression(node, context)
    local caller, fn
    local callerArg
    if (node.callee.type == 'MemberExpression') then
        local assign = ExprEval.evalMember(node.callee, context)
        caller = assign[1]
        fn = assign[2]
        callerArg = { caller }
    else
        fn = ExprEval.evaluate(node.callee, context)
    end
    if (type(fn) ~= 'function') then
        local name = ExprEval.nodeFunctionName(caller or node);
        error('"' .. toStr(name) .. '" is not a function',0)
        return cjson.null
    end
    local args = ExprEval.evaluateArray(node.arguments, context, callerArg)
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
    if (node.operator == '||') then
        return left or eval(node.right, context);
    elseif (node.operator == '&&') then
        return left and eval(node.right, context);
    end
    return operator.binops[node.operator](left, eval(node.right, context));
end

function ExprEval.ArrayExpression(node, context)
    return ExprEval.evaluateArray(node.elements, context);
end

function ExprEval.Identifier(node, context)
    local name = node.name
    debug('Here in Identifier. name = ', name)
    local val = context[name] or EXPR_GLOBALS[name]
    return (val == nil) and cjson.null or val
end

function ExprEval.Literal(node, context)
    return node.value
end

function ExprEval.ThisExpression(node, context)
    return context
end

function ExprEval.NullExpression(node, context)
    debug('Invalid handler found for node ', node)
    debug('context', context)
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
