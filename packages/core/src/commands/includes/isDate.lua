local function isDate(val)
    return type(val) == 'object' and val['__type'] == 'date'
end
