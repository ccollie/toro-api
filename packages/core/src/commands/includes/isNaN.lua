local NaN = 0/0

--- https://stackoverflow.com/questions/37753694/lua-check-if-a-number-value-is-nan
local function isNaN(number)
    return type(number) == 'number' and number ~= number
end
