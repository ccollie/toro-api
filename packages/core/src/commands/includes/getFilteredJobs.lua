--[[
  Get Jobs by filter criteria
     Input:
        key redis key of collectio holding ids
        keyPrefix prefix for job keys
        criteria filter criteria as a json encoded string. Essentially a jsep AST
        context additional context
        cursor cursor to use for the operation
        count scan count
     Returns:
        the list of jobs along with a count of the total items contained in the redis collection
]]
--- @include "job"
--- @include "eval"
--- @include "debug"
--- @include "isTruthy"
--- @include "scanJobIds"

local function getFilteredJobs(key, keyPrefix, criteria, context, cursor, count)
    local eval = ExprEval.evaluate
    local Job = Job

    count = count or 25

    -- fiddling with Globals is hacky, but scripts are meant to be short-lived
    if (context and #context > 0) then
        for k, v in pairs(context) do
            -- don't overwrite existing globals
            if (not EXPR_GLOBALS[k]) then
                EXPR_GLOBALS[k] = v
            end
        end
    end
    context = EXPR_GLOBALS
    --- debug("getFilteredJobs: ========================")
    --- debug(criteria)

    local n = 0
    local jobs = {}
    local newCursor, total = scanJobIds(key, keyPrefix, cursor, count, function(jobId)
        local job = Job:new(keyPrefix .. jobId, jobId)

        --- debug('in callback. Id = ', jobId, ' job = ', job)
        if (job.found) then
            context['job'] = job
            context['this'] = job
            local accept = isTruthy(eval(criteria, context))
            if (accept == true) then
                n = n + 1
                jobs[n] = job
            end
        end
    end)

    return jobs, newCursor, total
end
