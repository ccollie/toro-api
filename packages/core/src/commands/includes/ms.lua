local TICKS_PER_SEC = 1000
local TICKS_PER_HOUR = 3600000
local TICKS_PER_DAY = 86400000
local TICKS_PER_WEEK = TICKS_PER_DAY * 7
local TICKS_PER_YEAR = TICKS_PER_DAY * 365.25
local TICKS_PER_MIN = 60000

local UNIT_TO_MILLIS = {
    ["milliseconds"] = 1,
    ["millisecond"] = 1,
    ["msecs"] = 1,
    ["msec"] = 1,
    ["ms"] = 1,
    ["seconds"] = TICKS_PER_SEC,
    ["second"] = TICKS_PER_SEC,
    ["secs"] = TICKS_PER_SEC,
    ["sec"] = TICKS_PER_SEC,
    ["s"] = TICKS_PER_SEC,
    ["minutes"] = TICKS_PER_MIN,
    ["minute"] = TICKS_PER_MIN,
    ["mins"] = TICKS_PER_MIN,
    ["min"] = TICKS_PER_MIN,
    ["m"] = TICKS_PER_MIN,
    ["hours"] = TICKS_PER_HOUR,
    ["hour"] = TICKS_PER_HOUR,
    ["hr"] = TICKS_PER_HOUR,
    ["h"] = TICKS_PER_HOUR,
    ["days"] = TICKS_PER_DAY,
    ["day"] = TICKS_PER_DAY,
    ["d"] = TICKS_PER_DAY,
    ["weeks"] = TICKS_PER_WEEK,
    ["week"] = TICKS_PER_WEEK,
    ["w"] = TICKS_PER_WEEK,
    ["years"] = TICKS_PER_YEAR,
    ["year"] = TICKS_PER_YEAR,
    ["yr"] = TICKS_PER_YEAR,
    ["y"] = TICKS_PER_YEAR,
}

--- @include "toStr"

-- we cache results here for efficiency. Requests are short-lived, so this
-- should not be an issue
local __ms_cache = {}

--- try to mimic ms on npm
--- https://github.com/vercel/ms/blob/master/index.js
local MS_PATTERN = '([+-]?%d*%.?%d+)%s*(%a+)'

local function ms(str)
    local key = 'ms_' .. str
    local result = __ms_cache[key]
    if (result == nil) then
        result = 0
        for n, unit in str:gmatch(MS_PATTERN) do
            local multiplier = assert(UNIT_TO_MILLIS[unit], 'ms - invalid unit "' .. toStr(unit) .. '"')
            local x = assert(tonumber(n), 'ms - invalid unit multiplier "' .. toStr(n) .. '"');
            result = result + (x * multiplier)
        end
        __ms_cache[key] = result
    end
    return result
end
