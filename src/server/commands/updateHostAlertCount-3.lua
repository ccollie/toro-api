--[[
      Update host alert count in redis
      Input:
        KEYS[1]   Queue Rule Index key
        KEYS[2]   destination

        ARGV[1]   rule key prefix
      Output:
        updated alert count
]]

local queuesIndexKey = KEYS[1]
local destination = KEYS[2]
local scratchKey = KEYS[3]

local total = 0
-- SORT doesnt work on HASHes as source, so we copy the keys (queues) to a scratch set
-- Fortunately for us, the hash keys are also the key prefixes
local queues = redis.call('HKEYS', queuesIndexKey)
redis.call('SADD', scratchKey, unpack(queues))
local fieldPattern = queuesIndexKey .. ':*->alertCount'
local counts = redis.call("SORT", scratchKey, "BY", "nosort", "GET", fieldPattern) or {}
redis.call('DEL', scratchKey)

local total = 0

for i = 1, #counts do
    total = total + (counts[i] or 0)
end

redis.call("SET", destination, total)

return total

