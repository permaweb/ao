import glob
from ao_module_lib.definition import Definition

def inject_c_files(definition: Definition, c_program: str, c_source_files: list):

    c_header_files = []
    
    c_source_files += glob.glob('/src/**/*.c', recursive=True)
    c_source_files += glob.glob('/src/**/*.cpp', recursive=True)
    c_header_files += glob.glob('/src/**/*.h', recursive=True)    
    c_header_files += glob.glob('/src/**/*.hpp', recursive=True)
    

    c_program = 'const char *process_handle(const char *arg_0, const char *arg_1);\n' + c_program
    c_program = c_program.replace('__FUNCTION_DECLARATIONS__', definition.make_c_function_delarations())

    c_program = c_program.replace('__LUA_BASE__', "")
    c_program = c_program.replace('__LUA_MAIN__', "")
    return c_program
