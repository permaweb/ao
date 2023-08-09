-- pack.lua
-- released under the Romantic WTF Public License
-- http://getmoai.com/wiki/index.php?title=User:Pygy/Romantic_WTF_Public_License

args = {...}
--require"luarocks.loader"
fs = require"lfs"
files = {}

root = args[1]:gsub( "/$", "" )
              :gsub( "\\$", "" )

function scandir (root, path)
-- adapted from http://keplerproject.github.com/luafilesystem/examples.html
    path = path or ""
    for file in fs.dir( root..path ) do
        if file ~= "." and file ~= ".." then
            local f = path..'/'..file
            local attr = lfs.attributes( root..f )
            assert (type( attr ) == "table")
            if attr.mode == "directory" then
                scandir( root, f )
            else
              if file:find"%.lua$" then
                hndl = (f:gsub( "%.lua$", "" )
                                 :gsub( "/", "." )
                                 :gsub( "\\", "." )
                                 :gsub( "^%.", "" )
                               ):gsub( "%.init$", "" )
                files[hndl] = io.open( root..f ):read"*a"
              end
            end
        end
    end
end

scandir( root )

acc={}

local wrapper = { "\n--------------------------------------\npackage.preload['"
                , nil, "'] = function (...)\n", nil, "\nend\n" }
for k,v in pairs( files ) do
  wrapper[2], wrapper[4] = k, v
  table.insert( acc, table.concat(wrapper) )
end

table.insert(acc, [[
-----------------------------------------------

do
  if not package.__loadfile then
    local original_loadfile = loadfile
    local function lf (file)
      local hndl = file:gsub( "%.lua$", "" )
                       :gsub( "/", "." )
                       :gsub( "\\", "." )
                       :gsub( "%.init$", "" )
      return package.preload[hndl] or original_loadfile( name )
    end

    function dofile (name)
      return lf( name )()
    end

    loadfile, package.__loadfile = lf, loadfile
  end
end
]])
if files.main then table.insert( acc, '\ndofile"main.lua"' ) end
print( table.concat( acc ) )