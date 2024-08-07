import glob
import os
import re
import subprocess
import shutil
from ao_module_lib.definition import Definition
from ao_module_lib.file import LuaFile, ModuleFile, BundleFile
from ao_module_lib.helper import is_lua_source_file, is_binary_library, encode_hex_literals, shell_exec, debug_print

CC = os.environ.get('CC', 'cc')
NM = os.environ.get('NM', 'nm')

LUAROCKS_LOCAL_MODULE_DIR = '/src/modules' # os.path.abspath('/src/modules')
LUAROCKS_LOCAL_MODULE_PREFIX_RE = re.compile(re.escape(LUAROCKS_LOCAL_MODULE_DIR) + '\/share\/lua\/\d+.\d+/')



def inject_lua_files(definition: Definition, c_program: str, injected_lua_files: list):

    lua_files = []


    entry_file = '/opt/loader.lua'

    if not is_lua_source_file(entry_file):
        print('main file of {} must be lua script.'.format(entry_file))
        return

    definition.install_dependencies(LUAROCKS_LOCAL_MODULE_DIR)

    local_include_dir = os.path.join(os.path.dirname(entry_file), 'src')
    local_include_prefix_re = re.compile(re.escape(local_include_dir + '/'))

    bundle_files = glob.glob('/src/**/*.lua', recursive=True)
    bundle_files = list(filter(lambda x: not x.startswith("/src/libs"), bundle_files))
    bundle_files += glob.glob(local_include_dir + '/**/*.lua', recursive=True)

    for bundle in bundle_files:
        if is_lua_source_file(bundle):
            debug_print('Lua file found: {}'.format(bundle))
            basename = re.sub(LUAROCKS_LOCAL_MODULE_PREFIX_RE, '', bundle)
            basename = re.sub(local_include_prefix_re, '', basename)
            lua_files.append(LuaFile(bundle, basename))
            continue


    debug_print('===== Bundle Lua files ======')
    debug_print('\n'.join([v.filepath for v in lua_files]))

    with open('/opt/main.lua', mode='r') as lua:
        lua_program = lua.read()

    c_program = c_program.replace(
        '__LUA_BASE__', encode_hex_literals(lua_program))
    with open(entry_file, mode='r') as main_file:
        p = main_file.read()
        c_program = c_program.replace('__LUA_MAIN__', encode_hex_literals(p))

    for i, f in enumerate(lua_files):
        with open(f.filepath, mode='r') as l:
            lines = l.readlines()
            # check first line has control command
            if lines[0].find("\xef\xbb\xbf") != -1:
                # UTF-8 byte order mark
                lines[0] = lines[0][4:]
            elif lines[0][0] == '#':
                # shebang
                lines = lines[1:]

            injected_lua_files.extend([
                '  static const unsigned char lua_require_{}[] = {{{}}};'.format(
                    i, encode_hex_literals('\n'.join(lines))),
                '  lua_pushlstring(L, (const char*)lua_require_{}, sizeof(lua_require_{}));'.format(i, i),
                '  lua_setfield(L, -2, "{}");\n'.format(f.module_name)
            ])

    c_program = c_program.replace(
        '__FUNCTION_DECLARATIONS__', definition.make_function_delarations())
    return c_program
