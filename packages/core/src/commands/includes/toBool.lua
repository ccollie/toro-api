local function toBool(value, ...)
    local bool = false
    if (value == nil or value == cjson.null) then return false end
    local t = type(value)
    if (t == 'string') then
        if (value == 'true') then
            return true
        end
        if (value == 'false') then
            return false
        end
        return #value > 0
    elseif t == 'boolean' then
        bool = value
    elseif (t == 'number') then
        bool = value ~= 0
    elseif t == 'function' then
        bool = bool(value(...))
    end
    return bool
end
