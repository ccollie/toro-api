local function isTruthy(value)
    if (value == true or value == false) then return value end
    if (value == nil or value == cjson.null or value == 0) then return false end
    local t = type(value)
    if (t == 'string' or t == 'table') then return #value > 0 end
    return true
end
