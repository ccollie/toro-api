--- @include "toStr.lua"
--- @include "isNil.lua"

local objectMethods = {
    toString = toStr
}

local function resolveFields(t)
    -- get t's metatable, or exit if not existing
    local mt = getmetatable(t)
    if type(mt)~='table' then return {} end

    -- get the __index from mt, or exit if not table
    local index = mt.__index
    return type(index) == 'table' and index or {}
end

local function om__getValues(name, obj, fn)
    if (isNil(obj)) then
        return {}
    end
    if type(obj) ~= 'table' then
        error('Object.'..name ..'(): parameter must be an object', 2)
    end
    local res = {}
    local i = 1
    for k, v in pairs(obj) do
        res[i] = fn(k, v)
        i = i + 1
    end
    local fields = resolveFields(obj)
    for k, v in pairs(fields) do
        fields[i] = fn(k, v)
        i = i + 1
    end
    return res
end

function objectMethods.keys(obj)
    return om__getValues('keys', obj, function(k, v) return k end)
end

function objectMethods.getOwnProperties(obj)
    return objectMethods.keys(obj)
end

function objectMethods.values(obj)
    return om__getValues('values', obj, function(k, v) return v end)
end

function objectMethods.entries(obj)
    return om__getValues('entries', obj, function(k, v) return {k, v} end)
end

