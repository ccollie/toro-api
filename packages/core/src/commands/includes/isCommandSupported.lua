--- Determine this redis instance supports the given command.
---
local function isCommandSupported(command)
  return redis.call('COMMAND', 'INFO', command) ~= nil
end
