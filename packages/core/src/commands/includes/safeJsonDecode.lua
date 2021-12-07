local function safeJsonDecode(value, default)
  local ok, result = pcall(cjson.decode, value)
  return ok and result or default
end
