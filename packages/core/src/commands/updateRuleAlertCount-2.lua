--[[
      Update rule alert count in redis
      Input:
        KEYS[1]   Rule key
        KEYS[2]   Rule alerts key

      Output:
        updated alert count
]]

local ruleKey = KEYS[1]
local ruleAlertsKey = KEYS[2]

local total = redis.call('ZCARD', ruleAlertsKey)
redis.call('HSET', ruleKey, 'alertCount', total)

return total

