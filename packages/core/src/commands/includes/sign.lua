local function sign(v)
    v = tonumber(v)
    if (v == nil) then return cjson.null end
    if (v < 0) then return -1 end
    if (v > 0) then return 1 end
    return 0
end
