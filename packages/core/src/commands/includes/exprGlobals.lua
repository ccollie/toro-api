--- @include "isArray"
--- @include "isEmpty"
--- @include "isString"
--- @include "ms"
--- @include "sign"
--- @include "round"
--- @include "truncate"

local function createMathFn(name)
  local fn = math[name]
  return function(val)
    local fn = fn
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
