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
--- @include "toStr"

-- see https://github.com/taskforcesh/bullmq/blob/master/src/classes/queue-keys.ts
local SPECIAL_KEYS = {
    active = 1,
    wait = 1,
    waiting = 1,
    ['waiting-children'] = 1,
    paused = 1,
    id = 1,
    delayed = 1,
    priority = 1,
    ['stalled-check'] = 1,
    completed = 1,
    failed = 1,
    stalled = 1,
    ['repeat'] = 1,
    limiter = 1,
    drained = 1,
    progress = 1,
    resumed = 1,
    meta = 1,
    events = 1,
    delay = 1,
    logs = 1,
}

local function scanJobIds(redisKey, cursor, count)
    local rcall = redis.call

    count = tonumber(count or 25)
    local fullScan = false
    local keyPrefix
    local lastColon, match
    local newCursor, scannedJobIds

    local itemCount = 0;

    local keyType = getRedisKeyType(redisKey)
    debug('Here. Key = ' .. redisKey .. ', type = ' .. keyType);

    --- Optimization:
    --- if the key is a list, and
    ---     count >= list length, and
    ---     cursor == 0
    --- then we can use lrange and return the list
    --- Otherwise, redis ends up doing a full scan
    local function isOptimalList()
        if (keyType == 'list') and (cursor == 0) then
            itemCount  = rcall('LLEN', redisKey)
            if (count >= itemCount) then
                return true
            end
        end
        return false
    end

    local function scan()
        local scanResult
        if (keyType == 'zset') then
            itemCount = rcall('zcard', redisKey)
            scanResult = rcall('zscan', redisKey, cursor, "COUNT", count)
            debug('here 2, itemCount = ' .. itemCount .. ', scanResult = ' .. toStr(scanResult))
        elseif keyType == 'set' then
            itemCount = rcall('scard', redisKey)
            scanResult = rcall('sscan', redisKey, cursor, "COUNT", count)
        elseif keyType == 'hash' then
            itemCount = rcall('hlen', redisKey)
            scanResult = rcall('hscan', redisKey, cursor, "COUNT", count)
        elseif isOptimalList() then
            scannedJobIds = rcall('LRANGE', redisKey, 0, -1)
            newCursor = 0
            return
        else
            fullScan = true
            if (lastColon == nil) then
                --- keys are prefix:queue-name:*
                --- find prefix by locating last colon
                lastColon = string.find(redisKey, "[^:]*$")
                keyPrefix = string.sub(redisKey, 1, lastColon - 1)
                match = keyPrefix .. '*'
                debug('key = ' .. redisKey .. ', prefix = ' .. keyPrefix..', Full Scan Match = ' .. match)
                itemCount = rcall('dbsize')
            end
            scanResult = rcall('scan', cursor, "COUNT", count, 'MATCH', match)
        end
        newCursor = scanResult[1]
        scannedJobIds = scanResult[2]
    end

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

    scan()

    if (fullScan) then
        -- does a keyspace as opposed to list scan.
        -- The total number of keys in the db can greatly outnumber the number of jobs
        -- so we try to minimise calls to this function by doing an extra loop if we
        -- dont find any ids in an iteration

        local prefixLen = #keyPrefix
        for j = 1, 2 do
            debug('full scan, j = ' .. j .. ', ids = ' .. toStr(scannedJobIds))
            for _, k in ipairs(scannedJobIds) do
                local id = k:sub(prefixLen + 1)
                -- job keys are prefix:queue-name:job-id, so check that there are no more colons
                -- also filter out admin keys
                if id:find(':') == nil and not SPECIAL_KEYS[id] then
                    addItem(id)
                end
            end
            if (#items > 0) then
                break
            end
            cursor = newCursor
            scan()
        end
    elseif (keyType == 'zset') then
        -- strip out score
        for i = 1, #scannedJobIds, 2 do
            local id = scannedJobIds[i]
            addItem(id)
        end
    else
        for _, id in ipairs(scannedJobIds) do
            addItem(id)
        end
    end

    return items, newCursor, itemCount
end
