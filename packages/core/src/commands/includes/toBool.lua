local function toBool(value)
    local bool = false
    if (value == nil or value == cjson.null) then return false end
    if (value == true or value == false) then return value end
    local t = type(value)
    if (t == 'string') then
        if (value == 'true') then
            return true
        end
        if (value == 'false') then
            return false
        end
        return #value > 0
    elseif (t == 'number') then
        bool = value ~= 0
    elseif (t == "table") then
        return #value > 0
    elseif t == 'function' then
        return true
    end
    return bool
end
