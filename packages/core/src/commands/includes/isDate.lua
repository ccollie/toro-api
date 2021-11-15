local function isDate(val)
    return type(val) == 'table' and type(val['getYear']) == 'function'
end
