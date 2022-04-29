
--[[
* FUNCTION: quantile( arr, prob[, sorted] )
*	Computes a quantile for a numeric array.
*
* @param {Array} arr - 1d array
* @param {Number} p - quantile prob [0,1]
* @param {boolean} sorted: boolean flag indicating if the input array is sorted
* @returns {Number} quantile value
]]
local function quantile(arr, p, sorted)
    if (type(p) ~= 'number') then
        error(
'quantile()::invalid input argument. Quantile probability must be numeric.')
    end
    if (p < 0 or p > 1) then
        error(
'quantile()::invalid input argument. Quantile probability must be on the interval [0,1].')
    end

    local len = #arr
    local id

    if (not sorted) then
        local sortedData = arr
        for k, v in ipairs(arr) do
            sortedData[k] = v
        end
        table.sort(sortedData)
        arr = sortedData
    end

    --- Cases...

    --- [0] 0th percentile is the minimum value...
    if (p == 0.0) then
        return arr[1]
    end
    --- [1] 100th percentile is the maximum value...
    if (p == 1.0) then
        return arr[len]
    end
    --- Calculate the vector index marking the quantile:
    id = len * p;

    --- [2] Is the index an integer?
    if (id == math.floor(id)) then
        -- Value is the average between the value at id and id+1:
        return (arr[id] + arr[id + 1]) / 2.0;
    end
    --- [3] Round up to the next index:
    id = math.ceil(id)

    return arr[id]
end
