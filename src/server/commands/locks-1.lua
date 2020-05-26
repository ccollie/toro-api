
local LockAPI = {}

LockAPI.acquire = function(key, token, duration)
    if redis.call("set", key, token, "nx", "px", duration) then
        return 1
    else
        return 0
    end
end

LockAPI.extend = function(key, token, duration)
    local current = redis.call("get", key)
    if current == token then
        if redis.call("set", key, token, "px", duration) then
            return 1
        end
    elseif current == nil then
        -- acquire if the lock does not exist
        return LockAPI.acquire(key, token, duration)
    end
    return 0
end

LockAPI.release = function(key, token)
    if redis.call("get", key) == token then
        return redis.call("del", key)
    else
        return 0
    end
end

LockAPI.exists = function(key)
    return redis.call('exists', key ) == 1
end


local command_name = assert(table.remove(ARGV, 1), 'Must provide a command')
local command      = assert(LockAPI[command_name], 'Unknown command ' .. command_name)

return command(KEYS[1], unpack(ARGV))
