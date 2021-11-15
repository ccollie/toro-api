-- Translate relative (negative) indices to absolute
local function absIndex(len, i, fromJs)
  local x = fromJs and 1 or 0
  return i < 0 and (len + i + 1) or (i + x)
end
