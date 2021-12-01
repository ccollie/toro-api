--- @include "toStr"

local debug_flag = true

local function setDebug(val)
    debug_flag = val
end

local function debug(msg, ...)
    if (debug_flag) then
        local str = ''
        local args = { ... }
        for i = 1, #args do
            str = str .. toStr(args[i])
        end
        redis.call('rpush', 'alpen-debug', toStr(msg), str)
    end
end
