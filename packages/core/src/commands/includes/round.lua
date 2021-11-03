-- @include "truncate.lua"

local function round(num, place)
    local POSITIVE_INFINITY = 1e309;
    if ((num == nil or num == cjson.null) or (num ~= num) or math.abs(num) == POSITIVE_INFINITY) then
        return num
    end
    assert(type(num) == 'number', 'round: number expected.')

    return truncate(num, place, true)
end
