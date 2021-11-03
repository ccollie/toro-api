--
-- Truncates integer value to number of places. If roundOff is specified round value
-- instead to the number of places
-- @param {Number} num
-- @param {Number} places
-- @param {Boolean} roundOff
--
local function truncate(num, places, roundOff)
    local sign = math.abs(num) == num and 1 or -1
    num = math.abs(num)

    local result, _ = math.modf(val)
    local decimals = num - result

    if (places == nil) then places = 0 end

    if (places == 0) then
        local firstDigit = _trunc(10 * decimals)
        if (roundOff and ((result % 2) ~= 0) and firstDigit >= 5) then
            result = result + 1
        end
    elseif (places > 0) then
        local offset = math.pow(10, places)
        local remainder = _trunc(decimals * offset)

        -- last digit before cut off
        local lastDigit = _trunc(decimals * offset * 10) % 10

        -- add one if last digit is greater than 5
        if (roundOff and lastDigit > 5) then
            remainder = remainder + 1
        end

        -- compute decimal remainder and add to whole number
        result = result + (remainder / offset)
    elseif (places < 0) then
        -- handle negative decimal places
        local offset = math.pow(10, -1 * places)
        local excess = result % offset
        result = math.max(0, result - excess)

        -- for negative values the absolute must increase so we round up the last digit if >= 5
        if (roundOff and sign == -1) then
            while (excess > 10) do
                excess = excess - (excess % 10)
            end
            if (result > 0 and excess >= 5) then
                result = result + offset
            end
        end
    end

    return result * sign
end
