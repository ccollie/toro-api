-- Create a new table of values by mapping each value in table through a transformation function
-- @param obj {table}
-- @param callback {function}
-- @return {*}
local function map(obj, callback)
    assert(type(obj) == 'table', 'expected an array in map')

    local accumulator = {}

    for _, current in ipairs(obj) do
        table.insert(accumulator, callback(current, _))
    end

    return accumulator
end
