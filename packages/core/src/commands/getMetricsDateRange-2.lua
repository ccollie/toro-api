--[[
  Returns metric data based on a date range.
]]

local metaKey = KEYS[1]
local dataKey = KEYS[2]
local rangeStart = assert(tonumber(ARGV[1] or 0), 'Numeric timestamp expected for range start')
local rangeEnd = assert(tonumber(ARGV[2] or -1), 'Numeric timestamp expected for range end')
local msPerMinute = 60 * 1000

local rcall = redis.call

-- round n to nearest minute
function round(n, direction)
  local fn = direction == 'up' and math.ceil or math.floor
  return fn(n / msPerMinute) * msPerMinute
end

-- Get the latest timestamp
local prevTS = tonumber(rcall("HGET", metaKey, "prevTS"))
local len = rcall("LLEN", dataKey)

local firstTS = 0
local result = {}

if len > 0 and (prevTS ~= nil) and prevTS > 0 then
  firstTS = prevTS - (len * msPerMinute)
  -- firstTS does not seem to be already rounded to the nearest minute on save
  local first = round(firstTS, 'down')
  rangeStart = rangeStart < first and first or round(rangeStart, 'down')

  if (rangeEnd == -1 or rangeEnd > prevTS) then
    rangeEnd = prevTS
  end
  rangeEnd = round(rangeEnd, 'up')

  -- map timestamps to list indices
  local startIndex = (rangeStart - first) / msPerMinute
  local endIndex = (rangeEnd - first) / msPerMinute

  -- Get the metric data
  result = rcall("LRANGE", dataKey, startIndex, endIndex)

  -- TODO: error if we get back less than (endIndex - startIndex) + 1, since that
  -- means we have a gap in the data.

  -- add metadata at the end of result
  len = #result
  result[len + 1] = first
  result[len + 2] = prevTS
  result[len + 3] = len
else
  result[1] = 0
  result[2] = 0
  result[3] = 0
end

return result
