--[[
  Get Jobs by filter criteria
     Input:
        key redis key of collection holding ids
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
    context = context or {}

    local jobs = {}
    local ids, newCursor, total = scanJobIds(key, keyPrefix, cursor, count)

    for _, jobId in ipairs(ids) do
        local job = Job:new(keyPrefix .. jobId, jobId)
        if (job.found) then
            context['job'] = job
            context['this'] = job
            if isTruthy(eval(criteria, context)) then
                table.insert(jobs, job)
            end
        end
    end

    return jobs, newCursor, total
end
