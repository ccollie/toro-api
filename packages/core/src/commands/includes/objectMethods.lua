--- @include "toStr.lua"

local objectMethods = {
    toString = toStr
}

function objectMethods.keys(obj)
    local res = {}
    local i = 1
    for k, _ in pairs(obj) do
        res[i] = k
        i = i + 1
    end
    return res
end

function objectMethods.getOwnProperties(obj)
    local res = {}
    local i = 1
    for k, _ in pairs(obj) do
        if (type(k) == 'string') then
            res[i] = k
            i = i + 1
        end
    end
    return res
end

function objectMethods.values(obj)
    local res = {}
    local i = 1
    for _, v in pairs(obj) do
        res[i] = v
        i = i + 1
    end
    return res
end

function objectMethods.entries(obj)
    local res = {}
    local i = 1
    for k, v in pairs(obj) do
        res[i] = {k, v}
        i = i + 1
    end
    return res
end

