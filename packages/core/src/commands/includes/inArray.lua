-- @include "isEqual.lua"

local function inArray(arr, value)
    local isEqual = isEqual
    for _, v in ipairs(arr) do
        if isEqual(v, value) then
            return true
        end
    end
    return false
end
