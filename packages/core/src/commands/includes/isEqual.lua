local function isEqual(o1, o2, ignore_mt)
    local ty1 = type(o1)
    local ty2 = type(o2)
    if ty1 ~= ty2 then
        -- special case handling of nil
        if ((o1 == nil or o1 == cjson.null) and (o2 == nil or o2 == cjson.null)) then
            return true
        end
        return false
    end

    -- non-table types can be directly compared
    if ty1 ~= 'table' then
        return o1 == o2
    end

    -- as well as tables which have the metamethod __eq
    local mt = getmetatable(o1)
    if not ignore_mt and mt and mt.__eq then
        return o1 == o2
    end

    for k1, v1 in pairs(o1) do
        local v2 = o2[k1]
        if (v2 == nil or v2 == cjson.null) or not isEqual(v1, v2, ignore_mt) then
            return false
        end
    end
    for k2, v2 in pairs(o2) do
        local v1 = o1[k2]
        if (v1 == nil or v1 == cjson.null)  then
            return false
        end
    end
    return true
end
