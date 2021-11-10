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
local keyPrefix = assert(ARGV[1], 'Key prefix not specified')
local expression = assert(cjson.decode(ARGV[2]), 'Invalid filter criteria. Expected a JSON encoded string')
local globals = ARGV[3]
local cursor = ARGV[4]
local count = tonumber(ARGV[5] or 10)

-- debug("===================== EXPRESSION ========================")
-- debug(expression)

if (globals ~= nil and #globals > 0) then
    globals = assert(cjson.decode(globals), 'Invalid globals. Expected a JSON encoded string')
    assert(type(globals) == 'table', 'globals should be a key-value hash')
else
    globals = {}
end

local result = { '', 0, 0 } -- placeholders for cursor, filtered count, total count

local jobs, newCursor, total = getFilteredJobs(key, keyPrefix, expression, globals, cursor, count)
local n = 0
for _, job in ipairs(jobs) do
    table.insert(result, "jobId")
    table.insert(result, job.id)
    local hash = job._hash;
    for k, v in pairs(hash) do
        table.insert(result, k)
        table.insert(result, v)
    end
    n = n + 1
end

if (newCursor == nil) then newCursor = cjson.null end
result[1] = newCursor
result[2] = n
result[3] = total

return result
