import glob
import os
import shutil

from ao_module_lib.helper import shell_exec
from ao_module_lib.definition import Definition
from ao_module_lib.config import Config

RUST_DIR = '/opt/aorustlib'
def inject_rust_files(definition: Definition, c_program: str, config: Config):

    c_header_files = []
    # rust_source_files = []

    c_header_files += glob.glob('/src/**/*.h', recursive=True)
    c_header_files += glob.glob('/src/**/*.hpp', recursive=True)

    inc = []
    for header in c_header_files:
        c_program = '#include "{}"\n'.format(header) + c_program

#    c_program = 'const char *process_handle(const char *arg_0, const char *arg_1);\n' + c_program


    c_program = c_program.replace('__FUNCTION_DECLARATIONS__', definition.make_c_function_delarations())
    c_program = c_program.replace('__LUA_BASE__', "")
    c_program = c_program.replace('__LUA_MAIN__', "")


    # rust_source_files += glob.glob('/src/**/*.rs', recursive=True)
    # rust_src_dir = os.path.join(RUST_DIR, "src")

    # for file in rust_source_files:
    #     if os.path.isfile(file):
    #         shutil.copy2(file, os.path.join(rust_src_dir))

#    prev_dir = os.getcwd()
#    os.chdir(RUST_DIR)

    # build rust code at '/src'
    target = config.target == 64 and 'wasm64-unknown-unknown' or 'wasm32-unknown-unknown'
    os.environ["RUSTFLAGS"] = "--cfg=web_sys_unstable_apis --Z wasm_c_abi=spec"
    cmd = [
        'cargo',
        '+nightly',
        'build',
        '-Zbuild-std=std,panic_unwind,panic_abort',
        # '-Zbuild-std-features=panic_immediate_abort',
        f'--target={target}',
        '--release'
        ]

    shell_exec(*cmd)
    rust_lib = glob.glob(f'/src/target/{target}/release/*.a', recursive=True)[0]
    rust_lib = shutil.copy2(rust_lib, RUST_DIR)

    cmd = [
        'cbindgen',
        '--config',
        'cbindgen.toml',
            '--crate',
            'aorust',
            '--output',
            'aorust.h'
        ]
    shell_exec(*cmd)
    rust_header = shutil.copy2('/src/aorust.h', RUST_DIR)
    c_program = '#include "{}"\n'.format('aorust.h') + c_program
#    os.chdir(prev_dir)
    return c_program
