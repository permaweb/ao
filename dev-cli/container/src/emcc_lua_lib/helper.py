import os
import subprocess

IS_DEBUG = os.environ.get('DEBUG', '')

def encode_hex_literals(source):
    return ', '.join([r'0x{:02x}'.format(x) for x in source.encode('utf-8')])


def get_extention(file):
    basename = os.path.basename(file)
    return os.path.splitext(basename)[1][1:]


def is_lua_source_file(file):
    ext = get_extention(file)
    return ext == 'lua' or ext == 'luac'


def is_binary_library(file):
    ext = get_extention(file)
    return ext == 'o' or ext == 'a' or ext == 'so' or ext == 'dylib'


def shell_exec(*cmd_args):
    proc = subprocess.run(list(cmd_args), stdout=subprocess.PIPE)
    return proc.stdout.decode('utf-8').strip('\n'), proc.returncode

def debug_print(message):
    if IS_DEBUG:
        print(message)

