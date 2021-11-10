--[[
  scan job ids by cursor, executing a callback for each id
     Input:
        redisKey Queue / Name Set Key
        keyPrefix Key Prefix
        cursor  scan cursor
        count count
        callback callback function. Receives a job id (non prefixed)
]]
--- @include "toStr"
--- @include "getRedisKeyType"
--- @include "debug"

local ADMIN_KEYS = {
    ['id'] = 1,
    ['wait'] = 1,
    ['waiting'] = 1,
    ['events'] = 1,
    ['meta'] = 1,
    ['active'] = 1,
    ['completed'] = 1,
    ['failed'] = 1,
    ['stalled'] = 1,
    ['delayed'] = 1,
    ['paused'] = 1,
    ['repeat'] = 1,
}

local function getIdPart(key, prefix)
    local sub = key:sub(#prefix + 1)
    if sub:find(':') == nil and not ADMIN_KEYS[sub] then
        return sub
    end
    return nil
end

local function scanJobIds(redisKey, keyPrefix, cursor, count, callback)
    local getIdPart = getIdPart
    local rcall = redis.call

    count = tonumber(count or 25)
    local scanResult
    local match = keyPrefix .. '*'
    local fullScan = false

    local itemCount = 0;

    if type(callback) ~= 'function' then
        error("function expected for callback in scanJobIds")
    end

    local idSeen = {}

    local keyType = getRedisKeyType(redisKey)
    if (keyType == 'zset') then
        itemCount = rcall('zcard', redisKey)
        scanResult = rcall('zscan', redisKey, cursor, "COUNT", count, 'MATCH', match)
    elseif keyType == 'set' then
        itemCount = rcall('scard', redisKey)
        scanResult = rcall('sscan', redisKey, cursor, "COUNT", count, 'MATCH', match)
    elseif keyType == 'hash' then
        itemCount = rcall('hlen', redisKey)
        scanResult = rcall('hscan', redisKey, cursor, "COUNT", count, 'MATCH', match)
    else
        fullScan = true
        itemCount = rcall('dbsize')
        scanResult = rcall('scan', cursor, "COUNT", count, 'MATCH', match)
    end

    local newCursor = scanResult[1]
    local scannedJobIds = scanResult[2]

    local n = 0

    local function exec(id)
        --- iteration can visit an id more than once
        if (not idSeen[id]) then
            idSeen[id] = true
            n = n + 1
            --- debug("About to callback. Id = ", id)
            return callback(id, n, itemCount)
        end
    end

    --- debug('Here. Key = ', redisKey, ' keyType = ', keyType, ' fullscan = ', fullScan, ' scannedIds = ', scannedJobIds)

    if (fullScan) then
        -- does a keyspace as opposed to list scan. Filter out non-ids
        for _, k in ipairs(scannedJobIds) do
            local id = getIdPart(k, keyPrefix)
            if (id ~= nil) then
                if (exec(id) == false) then break end
            end
        end
    elseif (keyType == 'zset') then
        -- strip out score
        for _, val in ipairs(scannedJobIds) do
            if (exec(val[1]) == false) then break end
        end
    else
        for _, id in ipairs(scannedJobIds) do
            if (exec(id) == false) then break end
        end
    end

    return newCursor, itemCount
end
