--[[
      Clean a range of items
      Input:
        KEYS[1]   stream key,

        ARGV[1]   retention time in ms. Items with timestamp < (latest - retention) are removed
        ARGV[2]   limit - max number of items to remove
      Output:
        the number of items removed
]]

local streamKey = KEYS[1]
local retention = assert(tonumber(ARGV[1]), 'retention value must be a number (ms)')
local limit = ARGV[2]

if (limit ~= nil) then
    limit = assert(tonumber(limit), 'limit value must be a number')
end

local SEPARATOR = '-'

--- split id into timestamp and sequence number
local function split(source)
    local start, ending = string.find(source, SEPARATOR, 1, true)
    if (start == nil) then
        return tonumber(source), nil
    end
    local timestamp = source:sub(1, start - 1)
    local sequence = source:sub(ending + 1)
    return tonumber(timestamp), sequence
end

local function isNumeric(text)
    return tonumber(text) and true or false
end

local function getLastWrite(key)
    local last = redis.pcall('XREVRANGE', key, '+', '-', 'COUNT', 1)
    if next(last) ~= nil then
        local ts = last[1][1]
        return split(ts)
    end
    -- Stream is empty or key doesn`t exist
    return nil
end

local result = 0

local lastWrite = getLastWrite(streamKey)
if (lastWrite ~= nil) then
    local last = lastWrite - 1
    local endId = last - retention
    local startId = '-'
    local range
    local ids = {}

    if (isNumeric(limit)) then
        range = redis.call('XREVRANGE', streamKey, tostring(endId), startId, 'COUNT', limit)
    else
        range = redis.call('XRANGE', streamKey, startId, tostring(endId))
    end

    local i = 1
    for _, value in ipairs(range) do
        ids[i] = value[1]
        i = i + 1
    end

    result = redis.call('XDEL', streamKey, unpack(ids))
end

return result

