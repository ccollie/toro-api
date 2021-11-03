
local jsonMethods = {
    parse = function(val)
        if (type(val) ~= 'string') then return cjson.null end
        local ok, res = pcall(cjson.decode, val)
        return ok and res or cjson.null
    end,
    stringify = function(val)
        local ok, res = pcall(cjson.encode, val)
        return ok and res or cjson.null
    end
}
