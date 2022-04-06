-- recursively check if there are no locks on the
-- jobs to be removed.

-- Includes
--- @include "<base>/includes/destructureJobKey"

local function isJobLocked( prefix, jobId)
  local jobKey = prefix .. jobId;

  -- Check if this job is locked
  local lockKey = jobKey .. ':lock'
  local lock = redis.call("GET", lockKey)
  if not lock then
    local dependencies = redis.call("SMEMBERS", jobKey .. ":dependencies")
    if (#dependencies > 0) then
      for i, childJobKey in ipairs(dependencies) do
        -- We need to get the jobId for this job.
        local childJobId = getJobIdFromKey(childJobKey)
        local childJobPrefix = getJobKeyPrefix(childJobKey, childJobId)
        local result = isJobLocked( childJobPrefix, childJobId )
        if result then
          return true
        end
      end
    end
    return false
  end
  return true
end
