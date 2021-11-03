
local function toInt(val, radix)
    val = tonumber(val, radix or 10)
    if (val == nil) then return cjson.null end
    local res, _ = math.modf(val)
    -- todo: handle date
    return res
end
