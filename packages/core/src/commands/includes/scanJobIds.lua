--[[
  return job ids by cursor. Uses variants of the redis SCAN command based
  on the input key type
     Input:
        redisKey Queue / Name Set Key
        keyPrefix Key Prefix
        cursor  scan cursor
        count count - max number of ids to return per scan
    Output:
        job ids, scan cursor, total job ids at key, or dbsize in case of a full db scan
]]
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
    ['logs'] = 1,
}

local function scanJobIds(redisKey, keyPrefix, cursor, count)
    local rcall = redis.call

    count = tonumber(count or 25)
    local match = keyPrefix .. '*'
    local fullScan = false
    local prefixLen = #keyPrefix
    local newCursor, scannedJobIds

    local itemCount = 0;

    local keyType = getRedisKeyType(redisKey)

    local function scan()
        local scanResult
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
        newCursor = scanResult[1]
        scannedJobIds = scanResult[2]
    end

    scan()

    -- its possible for duplicate items to be returned, so we need to filter them out
    -- https://redis.io/commands/scan#scan-guarantees
    local idSeen = {}
    local items = {}
    local n = 0

    local function addItem(item)
        local items = items
        if not idSeen[item] then
            idSeen[item] = true
            n = n + 1
            items[n] = item
        end
    end

    if (fullScan) then
        -- does a keyspace as opposed to list scan.
        -- The total number of keys in the db can greatly outnumber the number of jobs
        -- so we try to minimise calls to this function by doing an extra loop if we
        -- dont find any ids in an iteration
        for j = 1, 2 do
            for _, k in ipairs(scannedJobIds) do
                local id = k:sub(prefixLen + 1)
                -- filter out admin keys
                if id:find(':') == nil and not ADMIN_KEYS[id] then
                    addItem(id)
                end
            end
            if (n > 0) then
                break
            end
            scan()
        end
    elseif (keyType == 'zset') then
        for _, val in ipairs(scannedJobIds) do
            -- strip out score
            addItem(val[1])
        end
    else
        for _, id in ipairs(scannedJobIds) do
            addItem(id)
        end
    end

    return items, newCursor, itemCount
end
