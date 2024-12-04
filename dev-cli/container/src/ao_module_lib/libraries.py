import glob
import os
import re
import subprocess
import shutil
from ao_module_lib.definition import Definition
from ao_module_lib.config import Config
from ao_module_lib.file import LuaFile, ModuleFile, BundleFile
from ao_module_lib.helper import is_lua_source_file, is_binary_library, encode_hex_literals, shell_exec, debug_print

CC = os.environ.get('CC', 'cc')
NM = os.environ.get('NM', 'nm')

LUAROCKS_LOCAL_MODULE_DIR = '/src/modules' # os.path.abspath('/src/modules')
LUAROCKS_LOCAL_MODULE_PREFIX_RE = re.compile(re.escape(LUAROCKS_LOCAL_MODULE_DIR) + '\/share\/lua\/\d+.\d+/')

def __get_uname():
    uname = ''
    try:
        uname, _ = shell_exec('uname', '-s')
    except (subprocess.CalledProcessError):
        uname = 'Unknown'

    return uname


def load_libraries(config: Config, definition: Definition, c_program: str, link_libraries: list, c_source_files: list, injected_lua_files: list, dependency_libraries: list):

    uname = __get_uname()

    lua_files = []
    library_files = []

    entry_file = '/opt/loader.lua'

    definition.install_dependencies(LUAROCKS_LOCAL_MODULE_DIR)

    local_include_dir = os.path.join(os.path.dirname(entry_file), 'src')
    local_include_prefix_re = re.compile(re.escape(local_include_dir + '/'))

    # Add C source files
    c_source_files += glob.glob('/src/libs/**/*.c', recursive=True)
    c_source_files += glob.glob('/src/libs/**/*.cpp', recursive=True)

    bundle_files = glob.glob('/src/libs/**/*.so', recursive=True)
    bundle_files += glob.glob('/src/libs/**/*.a', recursive=True)
    bundle_files += glob.glob('/src/libs/**/*.o', recursive=True)
    bundle_files += glob.glob('/src/libs/**/*.dylib', recursive=True)

    bundle_files += glob.glob('/opt/didkit.a', recursive=True)
    
    # Load aolib from /opt/aolibc/
    if(config.target == 64):
        bundle_files += glob.glob('/opt/aolibc/aolibc.a', recursive=True)
    else:
        bundle_files += glob.glob('/opt/aolibc/aolibc32.a', recursive=True)
    
    bundle_files += glob.glob('/src/libs/**/*.lua', recursive=True)
    # bundle_files += glob.glob(local_include_dir + '/**/*.so', recursive=True)
    bundle_files += glob.glob(LUAROCKS_LOCAL_MODULE_DIR +
                              '/lib/lua/**/*.so', recursive=True)
    bundle_files += glob.glob(LUAROCKS_LOCAL_MODULE_DIR +
                              '/share/lua/**/*.lua', recursive=True)

    for bundle in bundle_files:
        debug_print('*** Considering bundle: {}'.format(bundle))

        if is_lua_source_file(bundle):
            debug_print('Lua file found: {}'.format(bundle))
            basename = re.sub(LUAROCKS_LOCAL_MODULE_PREFIX_RE, '', bundle)
            basename = re.sub(local_include_prefix_re, '', basename)
            lua_files.append(LuaFile(bundle, basename))
            continue
        if is_binary_library(bundle):
            try:
                nm, _ = shell_exec(NM, bundle)
                is_module = False
                if re.search(r'T _?luaL_newstate', nm):
                    if re.search(r'U _?dlopen', nm):
                        if uname in ['Linux', 'SunOS', 'Darwin']:
                            libdl_option = '-ldl'

                else:
                    for luaopen in re.finditer(r'[^dD] _?luaopen_([0-9a-zA-Z!"#\$%&\'\(\)\*\+,\-\.\/:;\<=\>\?@\[\]^_`\{\|\}~]+)', nm):
                        debug_print('luaopen_{} function found. add to library in {}'.format(
                            luaopen.group(1), bundle))
                        library_files.append(
                            ModuleFile(bundle, luaopen.group(1)))
                        is_module = True

                if is_module:
                    link_libraries.append(BundleFile(bundle))
                else:
                    dependency_libraries.append(BundleFile(bundle))

            except (subprocess.CalledProcessError):
                print(NM + ' command failed')
                return

    debug_print('===== Lua Lib files ======')
    debug_print('\n'.join([v.filepath for v in lua_files]))
    debug_print('===== Link libraries =====')
    debug_print('\n'.join([v.filepath for v in link_libraries]))
    debug_print('===== Dependency libraries =====')
    debug_print('\n'.join([v.filepath for v in dependency_libraries]))

    injected_lua_files_length = len(injected_lua_files)

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
                    injected_lua_files_length + i, encode_hex_literals('\n'.join(lines))),
                '  lua_pushlstring(L, (const char*)lua_require_{}, sizeof(lua_require_{}));'.format(injected_lua_files_length + i, injected_lua_files_length + i),
                '  lua_setfield(L, -2, "{}");\n'.format(f.module_name)
            ])

    
    for f in library_files:
        injected_lua_files.extend([
            '  int luaopen_{}(lua_State* L);'.format(f.module_name),
            '  lua_pushcfunction(L, luaopen_{});'.format(f.module_name),
            '  lua_setfield(L, -2, "{}");'.format(f.basename)
        ])

    
    return c_program
