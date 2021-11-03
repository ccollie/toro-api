--[[
      Check if an id exists in a collection.
      Input:
        KEYS[...]   keys,
        ARGV[1]   job id
      Output:
        1 if id is in any of the lists specified by KEYS
        0 otherwise
]]
--- @include "./includes/isInRedisCollection.lua"

local jobId = ARGV[1]
for i=1, #KEYS do
    local found = isInRedisCollection(KEYS[i], jobId)
    if (found == true or found == 1) then
        return 1
    end
end

return 0
