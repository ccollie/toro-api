-- @include "inArray.lua"

-- intersect arrays (not hashes)
local function intersect(first, second)
    local t = {}
    local len = 0
    local dedupe = {}
    for _, v in ipairs(first) do
        if (not dedupe[v]) and inArray(second, v) then
            len = len + 1
            t[len] = v
            dedupe[v] = true
        end
    end
    return t
end
