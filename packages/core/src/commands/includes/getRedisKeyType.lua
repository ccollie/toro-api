local function getRedisKeyType(key)
    if (key ~= nil and #key > 0) then
        local keyType = redis.call("TYPE", key)
        return keyType["ok"]
    end
    return 'unknown'
end
