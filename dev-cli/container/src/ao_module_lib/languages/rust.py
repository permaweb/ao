import glob
import os
import shutil

from ao_module_lib.helper import shell_exec
from ao_module_lib.definition import Definition

RUST_DIR = '/opt/aorustlib'
def inject_rust_files(definition: Definition, c_program: str):

    c_header_files = []
    rust_source_files = []

    c_header_files += glob.glob('/src/**/*.h', recursive=True)    
    c_header_files += glob.glob('/src/**/*.hpp', recursive=True)

    inc = []
    for header in c_header_files:
        c_program = '#include "{}"\n'.format(header) + c_program

    # c_program = 'const char *process_handle(const char *arg_0, const char *arg_1);\n' + c_program


    c_program = c_program.replace('__FUNCTION_DECLARATIONS__', definition.make_c_function_delarations())


    rust_source_files += glob.glob('/src/**/*.rs', recursive=True)
    rust_src_dir = os.path.join(RUST_DIR, "src")

    for file in rust_source_files:
        if os.path.isfile(file):
            shutil.copy2(file, os.path.join(rust_src_dir))

    prev_dir = os.getcwd()
    os.chdir(RUST_DIR)

    os.environ["RUSTFLAGS"] = "--cfg=web_sys_unstable_apis --Z wasm_c_abi=spec"
    cmd = [
        'cargo',
        '+nightly',
        'build',
        '-Zbuild-std=std,panic_unwind,panic_abort',
        # '-Zbuild-std-features=panic_immediate_abort',
        '--target=wasm64-unknown-unknown',
        '--release'
        ]

    shell_exec(*cmd)
    rust_lib = glob.glob('/opt/aorustlib/**/release/*.a', recursive=True)[0]
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
    c_program = '#include "{}"\n'.format('/opt/aorustlib/aorust.h') + c_program
    os.chdir(prev_dir)
    return c_program
