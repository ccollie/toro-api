--[[
  Returns metric data based on a date range.
]]
-- From internet sleuthing. This is apparently not in the docs
local MAX_INTEGER = 9007199254740994

local metaKey = KEYS[1]
local dataKey = KEYS[2]
local rangeStart = assert(tonumber(ARGV[1] or 0), 'Numeric timestamp expected for range start')
local endRange = assert(tonumber(ARGV[2] or MAX_INTEGER), 'Numeric timestamp expected for range end')
local msPerMinute = 60 * 1000

local rcall = redis.call

-- round n to nearest minute
function round(n, direction)
  local fn = direction == 'up' and math.ceil or math.floor
  return fn(n / msPerMinute) * msPerMinute
end

-- Get the latest timestamp
local prevTS = rcall("HGET", metaKey, "prevTS")

local result = {}

local len = rcall("LLEN", dataKey)
local firstTS = 0
if len > 0 and prevTS and prevTS > 0 then
  firstTS = prevTS - (len * msPerMinute)
  -- firstTS does not seem to be already rounded to the nearest minute on save
  local first = round(firstTS, 'down')
  if (rangeStart < first) then
    rangeStart = first
  else
    rangeStart = round(rangeStart, 'down')
  end

  if (rangeEnd == -1 or rangeEnd > prevTS) then
    endRange = prevTS
  end
  endRange = round(endRange, 'up')

  -- map timestamps to list indices
  local startIndex = math.floor((rangeStart - first) / msPerMinute)
  local endIndex = math.floor((endRange - first) / msPerMinute)

  -- Get the metric data
  local data = rcall("LRANGE", dataKey, startIndex, endIndex)

  -- TODO: error if we get back less than (endIndex - startIndex) + 1, since that
  -- means we have a gap in the data.

  -- add metadata at the end of result
  len = #data
  data[len + 1] = first
  data[len + 2] = prevTS
  data[len + 3] = len
  return data
else
  result[1] = 0
  result[2] = 0
  result[3] = 0
end

return result
