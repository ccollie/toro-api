--[[
      Update queue alert count in redis
      Input:
        KEYS[1]   Queue Rule Index key
        KEYS[2]   destination

        ARGV[1]   rule key prefix
      Output:
        updated alert count
]]

local rulesIndexKey = KEYS[1]
local destination = KEYS[2]

local fieldPattern = rulesIndexKey .. ':*->alertCount'
local counts = redis.call("SORT", rulesIndexKey, "BY", "nosort", "GET", fieldPattern) or {}
local total = 0

for _, count in ipairs(counts) do
    total = total + (count or 0)
end

redis.call("SET", destination, total)

return total

