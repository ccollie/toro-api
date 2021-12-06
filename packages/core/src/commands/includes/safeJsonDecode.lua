local function safeJsonDecode(value, default)
  local ok, result = pcall(json.decode, value)
  if ok then
    return result
  else
    return default
  end
end
