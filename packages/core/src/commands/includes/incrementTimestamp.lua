
--- @include "isDigitsOnly"

local function incrementTimestamp(val)
    local ASCII_ZERO = 48
    -- From internet sleuthing. This is apparently not in the docs
    local MAX_INTEGER = 9007199254740994

    local num = tonumber(val)
    if (num == nil) or (num >= MAX_INTEGER) then
        val = tostring(val)
        --- is it a string containing only digits ?
        if (type(val) == 'string' and isDigitsOnly(val)) then
            -- bigint/snowflake id
            local j = #val
            local carry = 1
            local right = ''
            while j > 1 do
                local digit = val:byte(j) - ASCII_ZERO
                digit = digit + carry
                if (digit > 9) then
                    carry = digit - 9
                    right = '0' .. right
                else
                    right = digit .. right
                    break
                end
                j = j - 1
            end
            local res = val:sub(1, j - 1) .. right
            return res
        end
    else
        return num + 1
    end
    return assert(false, "timestamp must be a number. got: " .. tostring(val))
end
