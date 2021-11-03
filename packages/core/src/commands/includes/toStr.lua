local function toStr(value, ...)
    local str = ''
    local t = type(value)
    if t == 'string' then
        return value
    elseif (t == 'boolean') then
        return (value and 'true' or 'false')
    elseif (t == 'number') then
        return value .. ''
    elseif (t == 'nil' or value == cjson.null) then
        return 'null'
    elseif (t == 'function') then
        return toStr(value(...))
    elseif (t == 'table') then
        local isArr = true
        for k, v in pairs(value) do
            if (isArr) then
                if (type(k) ~= 'number' or v == nil or v == cjson.null) then
                    isArr = false
                end
            end
            t = type(v)
            v = (t == 'string') and ('"' .. v .. '"') or toStr(v, ...)
            if (t == 'number') then
                str = str .. v .. ', '
            else
                str = str .. ('"' .. k .. '"') .. ': ' .. v .. ', '
            end
        end
        local delims = isArr and { '[', ']' } or { '{', '}' }
        str = delims[1] .. str:sub(0, #str - 2) .. delims[2]
    end
    return str
end
