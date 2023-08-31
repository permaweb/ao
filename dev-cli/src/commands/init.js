const LUA = `
local contract = { _version = "0.0.1" }

function contract.handle(state, action, SmartWeave) 
  -- do stuff
  local response = {
    state = state,
    result = { messages = {} }
  }
  return response
end

return contract
`;

export function init(_, name) {
  const config = {
    name,
    entry: "src/main.lua",
    output: `${name}.lua`,
  };
  return Deno.mkdir(`./${name}`, { recursive: true })
    .then((_) => Deno.writeTextFile(`./${name}/contract.lua`, LUA));
}
