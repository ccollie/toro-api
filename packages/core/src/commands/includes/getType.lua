-- @include "isArray.lua"
-- @include "isDate.lua"

local function getType(val)
    if (val == cjson.null or val == nil) then
        return 'null'
    end
    local t = type(val)
    if (t == 'table') then
        if (isDate(val)) then return 'date' end
        return isArray(val) and 'array' or 'object'
    end
    return t
end
