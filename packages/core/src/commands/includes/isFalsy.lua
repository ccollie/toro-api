local function isFalsy(value)
    if (value == false or value == 0 or value == nil or value == cjson.null) then
        return true
    end
    local t = type(value)
    if (t == 'number') then
        -- NaN
        return (value ~= value)
    end
    if (t == 'string' or t == 'table') then return #value == 0 end
    return false
end
