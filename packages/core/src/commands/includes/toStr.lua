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
        return 'fn()'
    elseif (t == 'table') then
        local isArr = true
        local arrItems = {}
        local strArr = ''
        for k, v in pairs(value) do
            if (isArr) then
                if (type(k) ~= 'number' or v == nil) then
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
            strArr = strArr .. v .. ', '
        end
        local delims = isArr and { '[', ']' } or { '{', '}' }
        str = isArr and strArr or str
        str = delims[1] .. str:sub(0, #str - 2) .. delims[2]
    end
    return str
end