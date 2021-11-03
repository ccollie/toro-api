local function isArray(t)
    if (type(t) ~= 'table') then
        return false
    end
    for _, v in pairs(t) do
        if (type(_) ~= 'number' or v == nil) then
            return false
        end
    end
    return true
end
