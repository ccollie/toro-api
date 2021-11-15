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
        local _args = { toStr(msg) }
        if (#str > 0) then
            table.insert(_args, str)
        end
        redis.call('rpush', 'alpen:debug', unpack(_args))
    end
end
