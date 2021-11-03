-- @include "some.lua"

local function matches(a, pattern)
    assert(type(pattern) == 'string', 'matches: pattern should be a string')

    local function isMatch(x)
        return (type(x) == 'string') and x:match(pattern)
    end

    if (type(a) ~= 'table') then return isMatch(x) end

    return some(a, function(x)
        local t = type(x)
        if (isMatch(x)) then return true end
        if (t == 'table') then
            for _, str in ipairs(x) do
                if isMatch(str) then
                    return true
                end
            end
        end
        return false
    end)
end
