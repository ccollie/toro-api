----- Job Definition -----------------------------------------------------
-- https://github.com/taskforcesh/bullmq/blob/master/src/classes/job.ts#L23
local JOB_JSON_FIELDS = {
    data = 1,
    opts = 1,
    returnValue = 1,
    stackTrace = 1
}

local JOB_NUMERIC_FIELDS = {
    processedOn = 1,
    finishedOn = 1,
    attemptsMade = 1,
    timestamp = 1
}

local function job_compute_timing(job, endField, startField)
    local ending = job[endField]
    local start = job[startField]
    if (ending ~= cjson.null) and (start ~= cjson.null) then
        return ending - start
    end
    return cjson.null
end

local job_timing_ops = {
    latency = function(job) return job_compute_timing(job, 'finishedOn', 'processedOn') end,
    waitTime = function(job) return job_compute_timing(job, 'processedOn', 'timestamp')  end,
    runtime = function(job) return job_compute_timing(job, 'finishedOn', 'processedOn')  end
}

local Job = {
    _hash = {},
    id = '',
    key = '',
    found = false,
    __eq = function (lhs, rhs)
        return lhs.id == rhs.id
    end,
    --- Only called when the key being read from the table does not already exist.
    __index = function (t, key)
        local raw = t._hash[key]
        if (JOB_NUMERIC_FIELDS[key]) then
            local num = tonumber(raw)
            return (num ~= nil) and num or cjson.null
        end
        if (JOB_JSON_FIELDS[key]) then
            if (type(raw) == 'string') then
                local ok, res = pcall(cjson.decode, raw)
                return ok and res or raw
            else
                return raw
            end
        end
        local fn = job_timing_ops[key]
        if (fn) then return fn(t) end
        if (key == 'progress') then
            local num = tonumber(raw)
            if (num ~= nil) then
                return num
            else
                local ok, res = pcall(cjson.decode, raw)
                return ok and res or raw
            end
        end
        return raw ~= nil and raw or cjson.null
    end
}

Job.__metatable = Job

function Job:new(key, id)
    -- the new instance
    local jobHash = redis.pcall('HGETALL', key) or {}
    local found = jobHash ~= nil and #jobHash > 0
    return setmetatable({_hash = jobHash, id = id, key = key, found = found}, Job)
end



