local function isTruthy(value)
    if (value == true or value == 1) then
        return true
    end
    local t = type(value)
    if (t == 'number') then
        return value ~= 0
    end
    if (t == 'string' or t == 'table') then return #value > 0 end
    return true
end
