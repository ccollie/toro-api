--[[
  Scan jobs return full or partial data
     Input:
        KEYS[1] Queue / Name Set Key
        options = {
            prefix  key prefix
            fields  array of field names to return. Default is all
            jobName job name to filter on. Leave blank to return all
            cursor  scan cursor
            count   max number of jobs to return per scan
        }
]]
--- @include "includes/toStr"
--- @include "includes/debug"
--- @include "includes/scanJobIds"
local key = KEYS[1]

local opts = cmsgpack.unpack(ARGV[1])

debug('key = ' .. key .. ' opts = '..toStr(opts))
local fields = opts.fields or {}
local jobName = opts.jobName

if (jobName == '') then
    jobName = nil
end

assert(type(fields) == 'table', 'fields must be an array')

local cursor = opts.cursor
local count = assert(tonumber(opts.count or 10), 'count must be a number');

local function toHash(fromRedis)
    local hash = {}
    for i = 1, #fromRedis, 2 do
        local k = fromRedis[i]
        hash[k] = fromRedis[i + 1]
    end
    return hash
end

local function hasField(name)
    if (#fields == 0) then
        return true
    end
    for i = 1, #fields do
        if (fields[i] == name) then return true end
    end
    return false
end

local ids, newCursor, total = scanJobIds(key, cursor, count)

local result = {
    cursor = newCursor,
    total = total,
    jobs = {}
}

debug('key = '..key ..', ids ' .. toStr(ids))
local lastColon = string.find(key, "[^:]*$")
local keyPrefix = string.sub(key, 1, lastColon - 1)

if (#ids > 0) then
    local getAll = false
    if (#fields > 0) then
        --- if we specify jobName, we need to return "jobName" so we can filter on it
        if (jobName) then
            if (not hasField('jobName')) then
                table.insert(fields, 'jobName')
            end
        end
    else
        getAll = true
    end
    local res
    for _, id in ipairs(ids) do
        local jid = keyPrefix .. id
        if (getAll) then
            res = redis.call('hgetall', jid)
        else
            res = redis.call('hmget', jid, unpack(fields))
        end
        debug('POOPOOLALA: key = '..keyPrefix..id ..', res ' .. toStr(res))
        job = toHash(res)
        if (jobName == nil or job.jobName == jobName) then
            -- always return id
            job.id = id
            table.insert(result.jobs, job)
        end
    end
end

return cjson.encode(result)
