--[[
  Get Jobs by filter criteria
     Input:
        KEYS[1] Queue / Name Set Key
        ARGV[1] Key Prefix
        ARGV[2] filter criteria as a json encoded string
        ARGV[3] globals as a json encoded string
        ARGV[4] cursor
        ARGV[5] count
]]
--- @include "includes/debug"
--- @include "includes/getFilteredJobs"

local key = KEYS[1]

local opts = cmsgpack.unpack(ARGV[1])
local keyPrefix = assert(opts.prefix, 'Key prefix not specified')
local action = assert(opts.action, 'action not specified')

local expression = assert(opts.criteria, 'Missing filter criteria')
assert(type(expression) == 'table', 'filter should be an object')
-- debug("===================== EXPRESSION ========================")
-- debug(expression)

local cursor = opts.cursor
local count = tonumber(opts.count or 10)

local globals = opts.globals
if (globals ~= nil and #globals > 0) then
    assert(type(globals) == 'table', 'globals should be a key-value hash')
else
    globals = {}
end


local jobs, newCursor, total = getFilteredJobs(key, keyPrefix, expression, globals, cursor, count)

local result = {
    cursor = newCursor,
    total = total,
}

if (action == 'getJobs') then
    local items = {}
    for _, job in ipairs(jobs) do
        table.insert(items, job._hash)
    end
    result.jobs = items
elseif (action == 'getIds') then
    local ids = {}
    for _, job in ipairs(jobs) do
        table.insert(ids, job.id)
    end
    result.ids = ids
elseif (action == 'remove') then
    local n = 0
    for _, job in ipairs(jobs) do
        table.insert(result, job.id)
        -- remove the job from the queue
        error('remove job not implemented')
        n = n + 1
    end
    filter.removed = n
else
    error('Invalid action: ' .. action)
end

return cjson.encode(result)
