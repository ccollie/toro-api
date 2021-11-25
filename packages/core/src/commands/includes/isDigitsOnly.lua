-- Does a string contain only digits ?
-- @string s a string
local function isDigitsOnly(s)
    return string.find(s,"^%d+$") == 1
end
