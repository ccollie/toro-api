--- @include "toStr.lua"

local function toDouble(val)
    local t = type(val)
    if (t == 'nil' or val == cjson.null) then
        return cjson.null
    end
    if (t == 'number') then
        return val
    end
    if (t == 'boolean') then
        return val and 1 or 0
    end
    if (t == 'string') then
        local res = tonumber(val)
        if (res ~= nil) then
            return res
        end
    end
    assert(false, 'cannot cast "' .. toStr(val) .. '" to double')
    return cjson.null
end
