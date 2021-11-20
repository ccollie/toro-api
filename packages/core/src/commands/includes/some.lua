local function some(arr, fn)
    for _, val in ipairs(arr) do
        if (fn(val)) then return true end
    end
    return false
end
