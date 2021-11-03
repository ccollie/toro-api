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
    parse = function(_, ...) return date(...) end
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
    ['Math'] = mathMethods,
    ['JSON'] = jsonMethods,
    ['Object'] = objectMethods,
    ['Date'] = DateOps,
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

function ExprEval.evaluateArray(list, context)
    local res = {}
    local eval = ExprEval.evaluate
    for _, v in ipairs(list) do
        res[_] = eval(v, context)
    end
    return res
end

function ExprEval.evaluateMember(node, context)
    local eval = ExprEval.evaluate
    local ObjectTypeMethods = ObjectTypeMethods
    local object = eval(node.object, context)
    local prop = node.property
    local key = node.computed and eval(prop, context) or prop['name']
    local val = object[key]

    if (isNil(val)) then
        local t = type(object)
        local obj = ObjectTypeMethods[t]
        if (obj == nil) then
            obj = TypeProps[t]
            if (obj == nil) then
                -- all because of lua's handling of tables
                if (t == 'table') then
                    -- possibly array
                    obj = arrayMethods
                end
            else
                val = obj()
                return {object, val}
            end
        end
        if (obj and obj[key]) then
            val = obj[key]
        else
            val = cjson.null
        end
    end
    return {object, val}
end

function ExprEval.MemberExpression(node, context)
    local value = ExprEval.evaluateMember(node, context)
    return value[2]
end

function ExprEval.UnaryExpression(node, context)
    return operator.unops[node.operator](ExprEval.evaluate(node.argument, context));
end

function ExprEval.CallExpression(node, context)
    local caller, fn, assign
    if (node.callee.type == 'MemberExpression') then
        assign = ExprEval.evaluateMember(node.callee, context)
        caller = assign[1]
        fn = assign[2]
    else
        fn = ExprEval.evaluate(node.callee, context)
    end
    if (type(fn) ~= 'function') then
        local name = ExprEval.nodeFunctionName(caller or node);
        error(name .. " is not a function",0)
        return cjson.null
    end
    local args = ExprEval.evaluateArray(node.arguments, context)
    return fn( unpack(args) )
end

--- https://github.com/EricSmekens/jsep/blob/0d4f9f8ef9f36a6b4719d601ce9d5a896bbb4376/packages/new/test/index.test.js#L12
function ExprEval.NewExpression(node, context)
    local ctorName = node.callee.name or '<unknown>'
    local fn = Ctors[ctorName]
    if (type(fn) ~= 'function') then
        error(ctorName .. " is not a constructor function",0)
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
    debug('BinaryExpression: ', node.left, ' ', node.operator, " ", node.right)
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
        end
        return v
    end
    return '<unknown>'
end

