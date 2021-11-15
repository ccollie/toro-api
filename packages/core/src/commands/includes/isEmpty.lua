local function isEmpty(value)
    if (value == cjson.null or value == nil) then return true end
    local t = type(value)
    if (t == 'string') then return #value == 0 end
    if (t == 'table') then return next(value)==nil end
    return false
end
