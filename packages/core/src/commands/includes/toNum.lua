-- @include "isDate"
local function toNum(value, ...)
    local num = 0
    local t = type(value)
    if t == 'string' then
        local ok = pcall(function()
            num = value + 0
        end)
        if not ok then
            num = math.huge
        end
    elseif (t == 'boolean') then
        num = value and 1 or 0
    elseif (t == 'number') then
        num = value
    elseif (isDate(value)) then
        num = value:getTime()
    elseif (t == 'function') then
        num = toNum(value(...))
    end
    return num
end
