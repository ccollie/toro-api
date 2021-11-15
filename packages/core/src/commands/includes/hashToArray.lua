local function hashToArray(hash)
  local array = {}
  for key, value in pairs(hash) do
    table.insert(array, key)
    table.insert(array, value)
  end
  return array
end
